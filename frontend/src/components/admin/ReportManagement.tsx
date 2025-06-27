import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext'; // Import the context hook


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
  anneeScolaire: { // Structure mise à jour pour correspondre aux données réelles
    id: number;
    libelle: string;
    // Vous pouvez ajouter d'autres champs de anneeScolaire si nécessaire
  };
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
interface AbsenceAPI {
  id: number;
  etudiant_id: number;
  date: string; // format YYYY-MM-DD
  heure_debut: string; // format HH:MM:SS
  heure_fin: string; // format HH:MM:SS
  justifie: boolean;
  justification: string | null;
  // Inclure d'autres champs si nécessaire, par exemple matiere_id, classe_id
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
    moyenneDevoirsPonderee?: number; // Nouvelle colonne

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
  absencesNonJustifieesHeures?: number; // Modifié pour stocker les heures
  totalElevesClasse?: number;
}

// Helper function to format academic year display
const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
  if (!annee || !annee.date_debut || !annee.date_fin) {
    return annee.libelle || "Année inconnue";
  }
  const startYear = new Date(annee.date_debut).getFullYear();
  const endYear = new Date(annee.date_fin).getFullYear();
  return annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear)) ? annee.libelle : `${annee.libelle || ''} (${startYear}-${endYear})`.trim();
};

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
const response = await fetch(
      `${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`,
      { cache: 'no-store' } // Ajout pour désactiver le cache
    );
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

const fetchAbsencesForStudent = async (
  etudiantId: number,
  anneeScolaireId: number,
  dateDebut: string, // YYYY-MM-DD
  dateFin: string    // YYYY-MM-DD
): Promise<AbsenceAPI[]> => {
  if (!etudiantId || !anneeScolaireId || !dateDebut || !dateFin) return [];
  try {
    const params = new URLSearchParams({
      etudiant_id: etudiantId.toString(),
      annee_scolaire_id: anneeScolaireId.toString(),
      date_debut: dateDebut,
      date_fin: dateFin,
    });
    const response = await fetch(`${API_BASE_URL}/absences?${params.toString()}`);
    if (!response.ok) {
      if (response.status === 404 || response.status === 204) return [];
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error fetching absences for student ${etudiantId}:`, error);
    toast({
      title: "Erreur de chargement des absences",
      description: `Impossible de charger les absences pour l'élève ID ${etudiantId}.`,
      variant: "destructive"
    });
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
     const generateAndSetBulletins = async () => {
      const canGenerateBulletins = eleves.length > 0 && matieres.length > 0 && coefficients.length > 0 &&
                                   selectedClassId && selectedTermId && selectedAnneeAcademiqueId;
// Fonction utilitaire pour calculer la durée en heures
      const calculateDurationInHours = (heureDebutStr?: string, heureFinStr?: string): number => {
        if (!heureDebutStr || !heureFinStr) return 0;
        try {
          const [hD, mD] = heureDebutStr.split(':').map(Number);
          const [hF, mF] = heureFinStr.split(':').map(Number);
          const debutMinutes = hD * 60 + mD;
          const finMinutes = hF * 60 + mF;
          if (finMinutes < debutMinutes) return 0; // Gérer le cas où l'heure de fin est avant le début
          return (finMinutes - debutMinutes) / 60;
        } catch (e) {
          console.error("Error parsing time for duration calculation:", e);
          return 0;
        }
      };
      if (!canGenerateBulletins) {
        setBulletins([]);
        return;
      }

      setIsLoading(true); // Indiquer le début de la génération

      const classIdNum = parseInt(selectedClassId);
      const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
      const currentTrimestre = trimestres.find(t => t.id === parseInt(selectedTermId));

      const classIdNumForFilter = parseInt(selectedClassId);
      if (isNaN(classIdNumForFilter)) {
          setBulletins([]); // Si selectedClassId n'est pas valide, pas de bulletins
          return;
      }
      const generatedBulletinsPromises = eleves.filter(e => e.classeId === classIdNumForFilter).map(async (eleve) => {
                                let totalHeuresAbsenceNonJustifiees = 0;

        const bulletinMatiereDetailsPromises = matieres.map(async (matiere) => {
          const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;
          
          // Notes et évaluations du trimestre COURANT (déjà dans allEvaluations et allNotes)
          const evaluationsForMatiereCurrentTerm = allEvaluations.filter(e => e.matiere_id === matiere.id);
          const eleveNotesForMatiereCurrentTerm = allNotes.filter(note =>
            note.etudiant.id === eleve.id &&
            evaluationsForMatiereCurrentTerm.some(evalItem => evalItem.id === note.evaluation.id)
          );

          const notesEvaluations: EvaluationDetailBulletin[] = [];
          let totalPointsDevoirs = 0;
          let countDevoirs = 0;
          let compositionNoteValue: number | null = null; // Compo du trimestre courant

          dynamicEvaluationHeaders.forEach(headerLibelle => {
            const evalItemForHeader = evaluationsForMatiereCurrentTerm.find(e => e.libelle === headerLibelle);
            const note = eleveNotesForMatiereCurrentTerm.find(n => n.evaluation.id === evalItemForHeader?.id);
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

          // --- Nouvelle logique de calcul de moyenneMatiere ---
          let moyenneMatiere = 0;
          const currentTrimestreObj = trimestres.find(t => t.id === parseInt(selectedTermId));
          const currentTrimestreNumero = currentTrimestreObj ? parseInt(currentTrimestreObj.nom.replace('Trimestre ', '')) : 0;

          // Les variables `countDevoirs` et `compositionNoteValue` sont celles du trimestre courant,
          // calculées à partir de `dynamicEvaluationHeaders`.
          const avgDevoirsCurrentTerm = countDevoirs > 0 ? totalPointsDevoirs / countDevoirs : 0;
          const moyenneDevoirsPondereeCalc = avgDevoirsCurrentTerm * 3;

          let compoT1Note: number | null = null;
          let compoT2Note: number | null = null;

          // Récupération de la composition du Trimestre 1 si nécessaire
          if (currentTrimestreNumero === 2 || currentTrimestreNumero === 3) {
            const trimestre1Obj = trimestres.find(t => t.nom === "Trimestre 1" && t.anneeScolaire.id === anneeIdNum);
            if (trimestre1Obj) {
              const evalsT1 = await fetchEvaluationsForClassAndTerm(classIdNum, trimestre1Obj.id, anneeIdNum);
              const compoT1Eval = evalsT1.find(e => e.matiere_id === matiere.id && e.type === 'Composition');
              if (compoT1Eval) {
                const notesT1 = await fetchNotesForEvaluations([compoT1Eval.id], eleve.id);
                compoT1Note = notesT1.length > 0 ? notesT1[0].note : null;
              } else {
              }
            }
          }

          // Récupération de la composition du Trimestre 2 si nécessaire
          if (currentTrimestreNumero === 3) {
            const trimestre2Obj = trimestres.find(t => t.nom === "Trimestre 2" && t.anneeScolaire.id === anneeIdNum);
            if (trimestre2Obj) {
              const evalsT2 = await fetchEvaluationsForClassAndTerm(classIdNum, trimestre2Obj.id, anneeIdNum);
              const compoT2Eval = evalsT2.find(e => e.matiere_id === matiere.id && e.type === 'Composition');
              if (compoT2Eval) {
                const notesT2 = await fetchNotesForEvaluations([compoT2Eval.id], eleve.id);
                compoT2Note = notesT2.length > 0 ? notesT2[0].note : null;
              } else {
              }
            }
          }


          if (currentTrimestreNumero === 1) {
            if (countDevoirs > 0 && compositionNoteValue !== null) {
              moyenneMatiere = (avgDevoirsCurrentTerm * 3 + compositionNoteValue) / 4;
            } else if (countDevoirs > 0) {
              moyenneMatiere = avgDevoirsCurrentTerm;
            } else if (compositionNoteValue !== null) {
              moyenneMatiere = compositionNoteValue; // Note de compo si seule note
            }
          } else if (currentTrimestreNumero === 2) {
            

            if (countDevoirs > 0 && compositionNoteValue !== null && compoT1Note !== null) {
              moyenneMatiere = (avgDevoirsCurrentTerm * 3 + compositionNoteValue + compoT1Note) / 5;
            } else {
              // Fallback: Calculer avec ce qui est disponible, en ajustant le diviseur.
              // Ceci est une interprétation. Clarifiez la règle métier si une note est manquante.
              let sommePonderee = 0;
              let totalPoids = 0;
              if (countDevoirs > 0) { sommePonderee += avgDevoirsCurrentTerm * 3; totalPoids += 3; }
              if (compositionNoteValue !== null) { sommePonderee += compositionNoteValue; totalPoids += 1; }
              if (compoT1Note !== null) { sommePonderee += compoT1Note; totalPoids += 1; }
              moyenneMatiere = totalPoids > 0 ? sommePonderee / totalPoids : 0;
            }
          } else if (currentTrimestreNumero === 3) {
           
            if (countDevoirs > 0 && compositionNoteValue !== null && compoT1Note !== null && compoT2Note !== null) {
              moyenneMatiere = (avgDevoirsCurrentTerm * 3 + compositionNoteValue + compoT1Note + compoT2Note) / 6;
               if (matiere.nom === "Mathématiques") {
              }
            } else {
              // Fallback
              if (matiere.nom === "Mathématiques") {
              }
              let sommePonderee = 0;
              let totalPoids = 0;
              if (countDevoirs > 0) { sommePonderee += avgDevoirsCurrentTerm * 3; totalPoids += 3; }
              if (compositionNoteValue !== null) { sommePonderee += compositionNoteValue; totalPoids += 1; }
              if (compoT1Note !== null) { sommePonderee += compoT1Note; totalPoids += 1; }
              if (compoT2Note !== null) { sommePonderee += compoT2Note; totalPoids += 1; }
              moyenneMatiere = totalPoids > 0 ? sommePonderee / totalPoids : 0;
                             
            }
          } else {
              // Si ce n'est pas T1, T2, ou T3, ou si des données manquent pour le calcul standard,
            // on utilise l'ancienne méthode de calcul comme fallback.
            // Vous pourriez vouloir une autre logique ici.
            const WEIGHT_DEVOIRS_FALLBACK = 0.4;
            const WEIGHT_COMPOSITION_FALLBACK = 0.6;
            if (countDevoirs > 0 && compositionNoteValue !== null) {
                moyenneMatiere = (avgDevoirsCurrentTerm * WEIGHT_DEVOIRS_FALLBACK) + (compositionNoteValue * WEIGHT_COMPOSITION_FALLBACK);
            } else if (countDevoirs > 0) {
                moyenneMatiere = avgDevoirsCurrentTerm;
            } else if (compositionNoteValue !== null) {
                moyenneMatiere = compositionNoteValue;
            } else {
                moyenneMatiere = 0;
            }
          }

          const appreciation = "";

          return {
            matiere: matiere.nom,
            coefficient: coefficient,
            notesEvaluations: notesEvaluations,
            moyenneMatiere: parseFloat(moyenneMatiere.toFixed(2)),
            moyenneDevoirsPonderee: parseFloat(moyenneDevoirsPondereeCalc.toFixed(2)), // Ajout de la valeur calculée

            appreciation: appreciation,
          };
        });
// Récupérer et calculer les absences pour l'élève et le trimestre
        if (currentTrimestre) {
          const absencesEleve = await fetchAbsencesForStudent(
            eleve.id, anneeIdNum, currentTrimestre.date_debut, currentTrimestre.date_fin
          );
          absencesEleve.forEach(absence => {
            if (!absence.justification) {
              totalHeuresAbsenceNonJustifiees += calculateDurationInHours(absence.heure_debut, absence.heure_fin);
            }
          });
        }

         const resolvedBulletinMatiereDetails = await Promise.all(bulletinMatiereDetailsPromises);

        let totalPointsGeneraux = 0;
        let totalCoefficientsGen = 0;

        resolvedBulletinMatiereDetails.forEach(item => {
          totalPointsGeneraux += item.moyenneMatiere * item.coefficient;
          totalCoefficientsGen += item.coefficient;
        });

        const overallAvg = totalCoefficientsGen > 0 ? totalPointsGeneraux / totalCoefficientsGen : 0;
        return {
          id: eleve.id,
          name: `${eleve.prenom} ${eleve.nom}`,
          avg: parseFloat(overallAvg.toFixed(2)).toString(),
          rank: '',
          teacherComment: "Ce commentaire est une appréciation générale du professeur principal. Il doit être récupéré de l'API.",
          principalComment: "Ce commentaire est une appréciation du directeur. Il doit être récupéré de l'API.",
          notesParMatiere: resolvedBulletinMatiereDetails,
          absencesNonJustifieesHeures: parseFloat(totalHeuresAbsenceNonJustifiees.toFixed(1)),
          totalElevesClasse: eleves.length,
        };
      });

       const finalBulletins = await Promise.all(generatedBulletinsPromises);

      finalBulletins.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
      finalBulletins.forEach((bulletin, index) => {
        bulletin.rank = `${index + 1}/${finalBulletins.length}`;
      });

      setBulletins(finalBulletins);
      setIsLoading(false); // Indiquer la fin de la génération
    };

    if (eleves.length > 0 && matieres.length > 0 && coefficients.length > 0 && selectedClassId && selectedTermId && selectedAnneeAcademiqueId) {
      generateAndSetBulletins();
    }
     // Fonction utilitaire pour calculer la durée en heures
    const calculateDurationInHours = (heureDebutStr?: string, heureFinStr?: string): number => {
      if (!heureDebutStr || !heureFinStr) return 0;
      try {
        const [hD, mD] = heureDebutStr.split(':').map(Number);
        const [hF, mF] = heureFinStr.split(':').map(Number);
        const debutMinutes = hD * 60 + mD;
        const finMinutes = hF * 60 + mF;
        if (finMinutes < debutMinutes) return 0;
        return (finMinutes - debutMinutes) / 60;
      } catch (e) {
        return 0;
      }
    };

 }, [eleves, matieres, coefficients, allEvaluations, allNotes, selectedClassId, selectedTermId, selectedAnneeAcademiqueId, dynamicEvaluationHeaders, trimestres]);
 

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

  
    // Pour le bouton "Exporter en PDF" DANS LA PREVISUALISATION
  const exportPreviewedReport = () => {
    if (!selectedReport) {
        toast({ title: "Action impossible", description: "Aucun bulletin sélectionné pour l'export.", variant: "default" });
        return;
    }
    toast({
      title: "Export en PDF",
      description: `Le bulletin de ${selectedReport?.name} est en cours d'exportation en PDF.`,
    });
  
  };

   // setPreviewOpen(false); // Optionnel: fermer après export si l'utilisateur est dans la modale
  

  // Pour le bouton "Imprimer" DANS LA PREVISUALISATION
  const printPreviewedReport = () => {
    if (!selectedReport) {
        toast({ title: "Action impossible", description: "Aucun bulletin sélectionné pour l'impression.", variant: "default" });
        return;
    }
    
    window.print();
  
  };
// --- Fonctions pour les boutons PDF/Imprimer DANS LES LIGNES DU TABLEAU ---
  const exportReportFromRow = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    setPreviewOpen(true); // Ouvre la prévisualisation
    setTimeout(() => {
      toast({ title: "Export en PDF", description: `Préparation de l'export PDF du bulletin de ${bulletin.name}.` });
      // Logique d'exportation PDF ici, utilisant 'bulletin' ou 'selectedReport'
      console.log("Logique d'export PDF pour (depuis ligne):", bulletin.name);
      setPreviewOpen(false); // Ferme la prévisualisation automatiquement
    }, 300); // Délai pour permettre le rendu de la prévisualisation
  };

  const printReportFromRow = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    setPreviewOpen(true); // Ouvre la prévisualisation
    setTimeout(() => {
      toast({ title: "Impression", description: `Préparation de l'impression du bulletin de ${bulletin.name}.` });
      window.print();
      setPreviewOpen(false); // Ferme la prévisualisation automatiquement
    }, 300); // Délai pour permettre le rendu de la prévisualisation
  };
  const filteredBulletins = bulletins.filter(bulletin =>
    bulletin.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;

  // Fonction pour déterminer la mention en fonction de la moyenne
    const { schoolName, address, phone, website } = useEstablishmentInfo();

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
                <>                  {/* Desktop View */}                  <div className="hidden lg:block overflow-x-auto rounded-lg">
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
                              <Button variant="outline" size="sm" onClick={() => exportReportFromRow(bulletin)} className="text-purple-600 hover:bg-purple-50 rounded-md">
                                <FileDown className="h-4 w-4 mr-1" /> PDF
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => printReportFromRow(bulletin)} className="text-red-600 hover:bg-red-50 rounded-md">
                                <Printer className="h-4 w-4 mr-1" /> Imprimer
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                  {/* Mobile View */}
                  <div className="block lg:hidden space-y-4 p-2">
                    {filteredBulletins.map((bulletin) => (
                      <Card key={bulletin.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">{bulletin.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm border-t border-b py-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">Moyenne:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{bulletin.avg}/20</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">Classement:</span>
                            <span className="text-gray-800 dark:text-gray-100">{bulletin.rank}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">État:</span>
                            <Badge className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">Généré</Badge>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-3">
                          <Button variant="outline" size="sm" onClick={() => handlePreviewReport(bulletin)} className="text-blue-600 hover:bg-blue-50 rounded-md flex-1 justify-center">
                            <Eye className="h-4 w-4 mr-1" /> Prévisualiser
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => exportReportFromRow(bulletin)} className="text-purple-600 hover:bg-purple-50 rounded-md">
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => printReportFromRow(bulletin)} className="text-red-600 hover:bg-red-50 rounded-md">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-10 text-center shadow-lg border border-gray-200">
          <p className="text-gray-600 text-lg font-medium">Veuillez sélectionner une année scolaire, une classe et un trimestre pour consulter les bulletins.</p>
          <p className="text-gray-400 text-sm mt-2">Utilisez les menus déroulants ci-dessus pour commencer.</p>
        </div>
      )}

     <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
  <DialogContent
    className="
      max-w-6xl w-full p-0 rounded-lg overflow-hidden
      h-[calc(100vh-2rem)]
      print:h-[297mm] print:max-h-[297mm]
      print:rounded-none print:shadow-none print:border-none
            [&>button.absolute.right-4.top-4]:hidden /* Masque le bouton X par défaut */

    "
  >
    {/* Contenu imprimable */}
    <div
      id="bulletin-preview-content-area"
      className="
        bg-white
        h-full overflow-y-auto
        px-8 pt-8 pb-8
        print:p-[8mm] print:overflow-visible print:h-auto
        print:border print:border-gray-300 print:shadow-md print:rounded-md
      "
    >
      {/* En-tête */}
      <div className="grid grid-cols-3 gap-4 text-xs mb-6 print:mb-4">
        <div className="text-left">
          <p>République Islamique de Mauritanie</p>
          <p>Ministère de l'Éducation Nationale</p>
          <p>Direction des Examens et Concours</p>
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-blue-800 mb-1">BULLETIN DE NOTES</h2>
          <p className="font-semibold text-sm">
            Année Scolaire:{" "}
            <span className="text-blue-700">{/* Use formatAcademicYearDisplay here if annee object is available */}
              {anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}
            </span>
          </p>
          <p className="font-semibold text-sm">
            Trimestre:{" "}
            <span className="text-blue-700">
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

      {/* Info élève */}
      {selectedReport && (
        <div className="mb-6 text-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
  <div>
    <p><strong>Établissement:</strong> {schoolName}</p>
    <p><strong>Élève:</strong> {selectedReport.name}</p>
    <p><strong>Matricule:</strong> 123456</p>
  </div>
  <div className="text-right md:pl-8">
    <p><strong>Classe:</strong> {classes.find(c => c.id === parseInt(selectedClassId))?.nom}</p>
    <p><strong>Nombre d'élèves:</strong> {selectedReport.totalElevesClasse}</p>
    <p>
      <strong>Absences (non justifiées):</strong>{" "}
      <span className="text-red-600">{selectedReport.absencesNonJustifieesHeures ?? 0} h</span>
    </p>
  </div>
</div>

          <div className="border-t border-gray-300 pt-2 text-right text-xs print:text-xs">
            Date d'édition: {new Date().toLocaleDateString("fr-FR")}
          </div>
        </div>
      )}

      {/* Tableau des notes */}
      <div className="mb-6 overflow-x-auto text-xs print:text-xs">
        <Table className="w-full border border-gray-300 print:border print:border-gray-400 print:border-collapse">
          <TableHeader className="bg-blue-100 print:bg-gray-100">
  <TableRow>
    <TableHead className="min-w-[150px]">
      Matière<br />
      <span className="text-sm">المادة</span>
    </TableHead>
    <TableHead className="text-center">
      Coeff<br />
      <span className="text-sm">المعامل</span>
    </TableHead>
    
    {dynamicEvaluationHeaders
      .filter(header => header.toLowerCase().includes('devoir'))
      .map(header => (
        <TableHead key={header} className="text-center">
          {header}<br />
          <span className="text-sm">
            {header.toLowerCase().includes('devoir') ? 'الاختبار' : ''}
          </span>
        </TableHead>
      ))}
      
    {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
      <TableHead key="moy-dev-pond-header" className="text-center">
        Moy. devoir *3<br />
        <span className="text-sm">معدل الاختبارات *3</span>
      </TableHead>
    )}
    
    {dynamicEvaluationHeaders
      .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
      .map(header => (
        <TableHead key={header} className="text-center min-w-[120px]"> {/* Ajout de min-w pour un meilleur affichage */}
          {header.toLowerCase().startsWith('compo')
            ? `Compo. ${header.replace(/composition\s*/i, '')}`
            : header}
          <br />
         {header.toLowerCase().startsWith('compo')
              ? `امتحان ${header.replace(/composition\s*/i, '')}` // Ajustement pour la traduction
              : ''}

        </TableHead>
      ))}
      
    <TableHead className="text-center">
      Moy. Matiere<br />
      <span className="text-sm">معدل المادة</span>
    </TableHead>
    <TableHead className="min-w-[150px]">
      Observation<br />
      <span className="text-sm">ملاحظة</span>
    </TableHead>
  </TableRow>
</TableHeader>

          <TableBody>
            {selectedReport?.notesParMatiere.map(matiere => (
              <TableRow key={matiere.matiere} className="even:bg-gray-50 print:even:bg-white">
                <TableCell>{matiere.matiere}</TableCell>
                <TableCell className="text-center">{matiere.coefficient}</TableCell>
                {dynamicEvaluationHeaders.filter(header => header.toLowerCase().includes('devoir')).map(header => {
                  const note = matiere.notesEvaluations.find(n => n.libelle === header);
                  return (
                    <TableCell key={`${matiere.matiere}-${header}-devoir`} className="text-center">{note ? note.note : "00"}</TableCell>
                  );
                })}
                                                                {/* Moy. Dev. *3 Cell - S'affiche seulement s'il y a des devoirs */}
                {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                  <TableCell key={`${matiere.matiere}-moy-dev-pond`} className="text-center">
                    {matiere.moyenneDevoirsPonderee !== undefined ? matiere.moyenneDevoirsPonderee.toFixed(2) : '-'}
                  </TableCell>
                )}
                {/* Composition Notes */}
                {dynamicEvaluationHeaders.filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir')).map(header => {
                  const note = matiere.notesEvaluations.find(n => n.libelle === header);
                  return (
                    <TableCell key={`${matiere.matiere}-${header}-compo`} className="text-center">{note ? note.note : "00"}</TableCell>
                  );
                })}


                <TableCell className="text-center font-bold">{matiere.moyenneMatiere.toFixed(2)}</TableCell>
{/* Ici la colonne Observation */}
  <TableCell 
  className="observation-column" 
  style={{ textAlign: 'left', paddingLeft: '16px' }}
>
 
</TableCell>

                </TableRow>
            ))}
            {selectedReport && (
<TableRow className="bg-gray-50 font-bold print:bg-gray-100">
                {(() => {
                  let totalCoefficients = 0;
                  let totalPointsPonderes = 0;
                  selectedReport.notesParMatiere.forEach(matiere => {
                    totalCoefficients += matiere.coefficient;
                    totalPointsPonderes += matiere.moyenneMatiere * matiere.coefficient;
                  });                  const numDevoirHeaders = dynamicEvaluationHeaders.filter(h => h.toLowerCase().includes('devoir')).length;
                  const numCompoHeaders = dynamicEvaluationHeaders.filter(h => h.toLowerCase().includes('compo') && !h.toLowerCase().includes('devoir')).length;
                  const hasDevoirSpecificColumn = numDevoirHeaders > 0;
                                  const emptyCellColSpan = numDevoirHeaders + (hasDevoirSpecificColumn ? 1 : 0) + numCompoHeaders;

                  return (
                    <>
                      <TableCell>Totaux</TableCell> {/* Aligns with Matière */}
                      <TableCell className="text-center">{totalCoefficients.toFixed(0)}</TableCell> {/* Aligns with Coeff */}
                      {/* Empty cells for dynamic note headers */}
                      <TableCell colSpan={emptyCellColSpan}></TableCell>
                      {/* Total Points Pondérés */}
                      <TableCell className="text-center">{totalPointsPonderes.toFixed(2)}</TableCell> {/* Aligns with Moy. Matiere */}
                      {/* Moyenne Générale & Rang */}
                     
                    </>
                  );

                })()}
               
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Observations & Résultats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:text-sm">
        <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
          <h3 className="font-bold mb-2">Appréciation du Conseil de Classe</h3>
          <p className="italic">{selectedReport?.teacherComment}</p>
          <p className="text-right mt-4 text-xs">Signature du Professeur Principal</p>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
          <h3 className="font-bold mb-2">Observations du Directeur</h3>
          <p className="italic">{selectedReport?.principalComment}</p>
          <p className="text-right mt-4 text-xs">Signature du Directeur</p>
        </div>
      </div>

    {/* Résultats finaux */}
<div className="mb-6 text-center grid grid-cols-2 md:grid-cols-4 gap-6 print:text-sm bg-gray-50 p-5 rounded-lg shadow-md">
  {[{
    label: "Moyenne Générale",
    value: selectedReport?.avg ? parseFloat(selectedReport.avg).toFixed(2) + "/20" : "--",
    textColor: "text-blue-700"
  }, {
    label: "Rang",
    value: selectedReport?.rank ?? "--",
    textColor: "text-gray-900"
  }, {
    label: "Mention",
    value: selectedReport?.avg ? getMention(parseFloat(selectedReport.avg)) : "--",
    textColor: "text-indigo-600"
  }, {
    label: "Décision",
    value: selectedReport?.avg
      ? (parseFloat(selectedReport.avg) >= 10 ? "Admis(e)" : "Non Admis(e)")
      : "--",
    textColor: selectedReport?.avg && parseFloat(selectedReport.avg) >= 10 ? "text-green-600" : "text-red-600"
  }].map(({label, value, textColor}) => (
    <div key={label} className="flex flex-col items-center">
      <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-extrabold ${textColor}`}>{value}</p>
    </div>
  ))}
</div>



      {/* Pied de page */}
      <div className="text-center text-xs text-gray-500 pt-2 pb-6 print:pb-0 print:text-xs">
        
        <p className="mt-2">Cachet et Signature de l'Administration</p>
 <p className="mt-2">
          {schoolName} - {address}
          {phone && ` - Tél: ${phone}`}
          {website && ` - Site: ${website}`}
        </p>
         </div>
    </div>

    {/* Actions non imprimables */}
    <div className="bg-gray-100 px-6 py-4 flex justify-end gap-4 rounded-b-lg no-print">
      <Button variant="outline" onClick={() => setPreviewOpen(false)}>Fermer</Button>
      <Button onClick={exportPreviewedReport} className="bg-green-600 hover:bg-green-700 text-white">
        <FileDown className="mr-2 h-4 w-4" /> Exporter en PDF
      </Button>
      <Button onClick={printPreviewedReport} className="bg-blue-600 hover:bg-blue-700 text-white">
        <Printer className="mr-2 h-4 w-4" /> Imprimer
      </Button>
    </div>
  </DialogContent>
</Dialog> 

    </div>
  );
}