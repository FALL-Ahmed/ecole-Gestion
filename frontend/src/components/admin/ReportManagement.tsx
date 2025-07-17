import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PrintableReport } from '@/components/PrintableReport';import {
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
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, Search, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { useDebounce } from 'use-debounce';
import ReactDOMServer from 'react-dom/server';

import {
  calculateGeneralAverage,
  termEvaluationMap
} from '../../lib/grades';

// Interfaces
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
  anneeScolaire: {
    id: number;
    libelle: string;
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
  date: string;
  heure_debut: string;
  heure_fin: string;
  justifie: boolean;
  justification: string | null;
  annee_scolaire_id: number;
}

interface Note {
  id: number;
  note: number;
  evaluation: {
    id: number;
    matiere_id: number;
    matiere?: {
      id: number;
      nom: string;
    };
    type: 'Devoir' | 'Composition';
    classe_id: number;
    date_eval: string;
    trimestre: number;
    libelle?: string;
  };
  etudiant: {
    id: number;
    nom?: string;
    prenom?: string;
  };
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
  moyenneDevoirsPonderee?: number | null;
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
  absencesNonJustifieesHeures?: number;
  totalElevesClasse?: number;
}
interface PrintableReportProps {
  report: BulletinEleve | null;
  establishmentInfo: { schoolName: string, address: string, phone?: string, website?: string };
  selectedClass: string;
  selectedTerm: string;
  selectedYear: string;
  dynamicEvaluationHeaders: string[];
  getMention: (m: number) => string;
  t: (key: string) => string;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

const fetchData = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error;
  }
};

const fetchApiData = async (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

const fetchAnneesAcademiques = () => fetchApiData('annees-academiques');

const fetchClasses = async (anneeAcademiqueId: number) => {
  const allClasses = await fetchApiData('classes');
  return allClasses.filter((cls: Classe) => cls.annee_scolaire_id === anneeAcademiqueId);
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number) => {
  const inscriptions = await fetchApiData('inscriptions', {
        classe_id: classeId.toString(),
    annee_scolaire_id: anneeScolaireId.toString()
  
  });
  return inscriptions
    .filter((inscription: any) => inscription.utilisateur?.role === 'eleve')
    .map((inscription: any) => ({
      id: inscription.utilisateur.id,
      nom: inscription.utilisateur.nom || 'Inconnu',
      prenom: inscription.utilisateur.prenom || '',
      classeId: inscription.classe.id,
      inscriptionId: inscription.id,
    }));
};

const fetchMatieresAndCoefficientsByClasse = async (classeId: number) => {
  const coefficientClasses = await fetchData(
    `${API_BASE_URL}/coefficientclasse?classe_id=${classeId}`,
  );

  const uniqueMatieres = Array.from(new Set(
    coefficientClasses
      .map((cc: any) => cc.matiere?.id || cc.matiere_id)
      .filter(Boolean)
  ));

  return {
    matieres: uniqueMatieres.map(id => {
      const found = coefficientClasses.find((cc: any) =>
        (cc.matiere?.id || cc.matiere_id) === id
      );
      return found?.matiere || { id, nom: 'Matière inconnue' };
    }),
    coefficients: coefficientClasses.map((cc: any) => ({
      id: cc.id,
      matiere_id: cc.matiere?.id || cc.matiere_id,
      classe_id: cc.classe_id,
      coefficient: cc.coefficient,
    }))
  };
};

const fetchTrimestresByAnneeAcademique = (anneeAcademiqueId: number) =>
  fetchApiData('trimestres', {
    anneeScolaireId: anneeAcademiqueId.toString()
  });

const fetchEvaluationsForClassAndYear = async (classeId: number, anneeScolaireId: number) => {
  const params = {
    classe_id: classeId.toString(),
    annee_scolaire_id: anneeScolaireId.toString()
  };

  const data = await fetchApiData('evaluations', params);
  return data.map((evalItem: any) => ({
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
};

const fetchNotesForEvaluations = async (evaluationIds: number[], etudiantId?: number): Promise<Note[]> => {
  if (evaluationIds.length === 0) return [];

  try {
    const params = new URLSearchParams();
    evaluationIds.forEach(id => params.append('evaluation_id', id.toString()));

    if (etudiantId) {
      params.append('etudiant_id', etudiantId.toString());
    }

    params.append('_expand', 'evaluation');
    params.append('_expand', 'etudiant');

    const url = `${API_BASE_URL}/notes?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const data = await response.json();

    return data.map((item: any) => {
      const evalData = item.evaluation || {};
      const studentData = item.etudiant || {};

      return {
        id: item.id,
        note: parseFloat(item.note) || 0,
        evaluation: {
          id: evalData.id || item.evaluationId,
          matiere_id: evalData.matiere_id || evalData.matiereId,
          matiere: evalData.matiere ? {
            id: evalData.matiere.id || evalData.matiere_id,
            nom: evalData.matiere.nom || 'Inconnue'
          } : undefined,
          type: (evalData.type === 'Composition' ? 'Composition' : 'Devoir'),
          classe_id: evalData.classe_id || evalData.classeId,
          date_eval: evalData.date_eval || '',
          trimestre: parseInt(evalData.trimestre) || 1,
          libelle: evalData.libelle || `${evalData.type || 'Evaluation'} ${evalData.id || ''}`.trim()
        },
        etudiant: {
          id: studentData.id || item.etudiantId,
          nom: studentData.nom || 'Inconnu',
          prenom: studentData.prenom || ''
        }
      };
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des notes:", error);
    throw error;
  }
};

const fetchAbsencesForStudent = async (etudiantId: number, anneeScolaireId: number, dateDebut: string, dateFin: string) => {
  if (!etudiantId || !anneeScolaireId || !dateDebut || !dateFin) return [];
  return fetchApiData('absences', {
    etudiant_id: etudiantId.toString(),
    annee_scolaire_id: anneeScolaireId.toString(),
    date_debut: dateDebut,
    date_fin: dateFin
  });
};

const calculateDurationInHours = (heureDebut?: string, heureFin?: string): number => {
  if (!heureDebut || !heureFin) return 0;
  try {
    const [hD, mD] = heureDebut.split(':').map(Number);
    const [hF, mF] = heureFin.split(':').map(Number);
    const debutMinutes = hD * 60 + mD;
    const finMinutes = hF * 60 + mF;
    return finMinutes < debutMinutes ? 0 : (finMinutes - debutMinutes) / 60;
  } catch {
    return 0;
  }
};

// Composant principal
export function ReportManagement() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { schoolName, address, phone, website } = useEstablishmentInfo();
  const getTranslatedTerm = (termName: string) => {
    switch (termName) {
      case 'Trimestre 1': return t.gradeManagement.term1;
      case 'Trimestre 2': return t.gradeManagement.term2;
      case 'Trimestre 3': return t.gradeManagement.term3;
      default: return termName;
    }
  };

  // États
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
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<BulletinEleve | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dynamicEvaluationHeaders, setDynamicEvaluationHeaders] = useState<string[]>([]);

  const getAppreciation = useCallback((moyenne: number): string => {
    if (moyenne >= 16) return t.reportManagement.appreciations.excellent;
    if (moyenne >= 14) return t.reportManagement.appreciations.veryGood;
    if (moyenne >= 12) return t.reportManagement.appreciations.good;
    if (moyenne >= 10) return t.reportManagement.appreciations.fair;
    if (moyenne >= 8) return t.reportManagement.appreciations.encouragement;
    return t.reportManagement.appreciations.warning;
  }, [t]);

  const getTeacherComment = useCallback((moyenne: number): string => {
    if (moyenne >= 16) return t.reportManagement.comments.excellent;
    if (moyenne >= 14) return t.reportManagement.comments.veryGood;
    if (moyenne >= 12) return t.reportManagement.comments.good;
    if (moyenne >= 10) return t.reportManagement.comments.fair;
    if (moyenne >= 8) return t.reportManagement.comments.encouragement;
    return t.reportManagement.comments.warning;
  }, [t]);


  useEffect(() => {
    const loadAnneesAcademiques = async () => {
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
    };
    loadAnneesAcademiques();
  }, []);

  useEffect(() => {
    const loadClassesAndTrimestres = async () => {
      const anneeId = parseInt(selectedAnneeAcademiqueId);
      if (!anneeId) return;

      setIsLoading(true);
      try {
        const [trimestresData, classesData] = await Promise.all([
          fetchTrimestresByAnneeAcademique(anneeId),
          fetchClasses(anneeId)
        ]);

        setTrimestres(trimestresData);
        setClasses(classesData);

        if (!trimestresData.some(t => t.id.toString() === selectedTermId)) {
          setSelectedTermId('');
        }
        if (!classesData.some(c => c.id.toString() === selectedClassId)) {
          setSelectedClassId('');
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassesAndTrimestres();
  }, [selectedAnneeAcademiqueId]);

  useEffect(() => {
    const loadElevesAndMatieres = async () => {
      const classIdNum = parseInt(selectedClassId);
      const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
      if (!classIdNum || !anneeIdNum) return;

      setIsLoading(true);
      try {
        const [elevesData, matieresCoeffData] = await Promise.all([
          fetchElevesByClasse(classIdNum, anneeIdNum),
          fetchMatieresAndCoefficientsByClasse(classIdNum)
        ]);

        setEleves(elevesData);
        setMatieres(matieresCoeffData.matieres);
        setCoefficients(matieresCoeffData.coefficients);
      } catch (error) {
        console.error("Failed to load students or subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadElevesAndMatieres();
  }, [selectedClassId, selectedAnneeAcademiqueId]);

  useEffect(() => {
  const loadEvaluationsAndNotes = async () => {
    const classIdNum = parseInt(selectedClassId);
    const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
    const currentTermId = parseInt(selectedTermId);
    if (!classIdNum || !anneeIdNum || !currentTermId) return;

    setIsLoading(true);
    try {
      // 1. Récupère toutes les évaluations de l'année
      const allEvaluationsForYear = await fetchEvaluationsForClassAndYear(classIdNum, anneeIdNum);

      // 2. Filtre celles du trimestre sélectionné pour l'affichage et la génération des headers
const currentTerm = trimestres.find(t => t.id === parseInt(selectedTermId));
if (!currentTerm) return;

// Trouver le numéro du trimestre (1, 2 ou 3)
const termNumber = parseInt(currentTerm.nom.replace('Trimestre ', ''));

// Filtrer les évaluations pour le trimestre courant
const evaluationsForCurrentTerm = allEvaluationsForYear.filter(e => {
  return new Date(e.date_eval) >= new Date(currentTerm.date_debut) && 
         new Date(e.date_eval) <= new Date(currentTerm.date_fin);
});
    setAllEvaluations(evaluationsForCurrentTerm);

      // 3. Récupère les notes pour TOUTES les évaluations de l'année pour permettre les calculs cumulatifs
      const allEvaluationIdsForYear = allEvaluationsForYear.map(e => e.id);
      const notesData = await fetchNotesForEvaluations(allEvaluationIdsForYear);
      setAllNotes(notesData);

      // Mets à jour les headers dynamiques
      const termConfig = termEvaluationMap[trimestres.find(t => t.id === currentTermId)?.nom as keyof typeof termEvaluationMap];
      if (termConfig) {
        setDynamicEvaluationHeaders([
          termConfig.devoir1,
          termConfig.devoir2,
          termConfig.composition
        ]);
      }
    } catch (error) {
      console.error("Failed to load evaluations or notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  loadEvaluationsAndNotes();
}, [selectedClassId, selectedAnneeAcademiqueId, selectedTermId, trimestres]);
  // Nouvelle logique de calcul de moyenne inspirée de StudentGrades
  const generateBulletins = useCallback(async () => {
    const classIdNum = parseInt(selectedClassId);
    const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
    const termIdNum = parseInt(selectedTermId);
    // Trouver le trimestre actuellement sélectionné (T1, T2, T3)
const currentTerm = trimestres.find(t => t.id === parseInt(selectedTermId));
if (!currentTerm) return;

// Obtenir l'année scolaire à partir du trimestre courant
const currentYearId = currentTerm.anneeScolaire?.id || parseInt(selectedAnneeAcademiqueId);

// Retrouver les 3 trimestres de la même année scolaire
const term1 = trimestres.find(t =>
  t.nom === 'Trimestre 1' && t.anneeScolaire?.id === currentYearId
);
const term2 = trimestres.find(t =>
  t.nom === 'Trimestre 2' && t.anneeScolaire?.id === currentYearId
);
const term3 = trimestres.find(t =>
  t.nom === 'Trimestre 3' && t.anneeScolaire?.id === currentYearId
);


    if (!classIdNum || !anneeIdNum || !termIdNum) return;

    setIsLoading(true);

    try {
      const currentTerm = trimestres.find(t => t.id === termIdNum);
      if (!currentTerm) return;

      const termConfig = termEvaluationMap[currentTerm.nom as keyof typeof termEvaluationMap];
      if (!termConfig) return;

      const bulletinsPromises = eleves.map(async (eleve) => {
        let totalHeuresAbsenceNonJustifiees = 0;

        try {
          const absencesEleve = await fetchAbsencesForStudent(
            eleve.id,
            anneeIdNum,
            currentTerm.date_debut,
            currentTerm.date_fin
          );

          absencesEleve.forEach(absence => {
            if (!absence.justifie) {
              const heures = calculateDurationInHours(absence.heure_debut, absence.heure_fin);
              totalHeuresAbsenceNonJustifiees += heures;
            }
          });
        } catch (error) {
          console.error(`Error fetching absences for student ${eleve.id}:`, error);
        }

        // Moyennes par matière, logique inspirée de StudentGrades
        const matieresDetails = matieres.map((matiere) => {
          const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;

          // Filtrer toutes les notes de l'élève, pour la matière et le trimestre courant
         // Pour chaque matière...
// Pour chaque matière...
const notesForSubject = allNotes.filter(note =>
  note.etudiant.id === eleve.id &&
  note.evaluation.matiere_id === matiere.id
);

let devoir1Note: number | null = null;
let devoir2Note: number | null = null;
let compositionNote: number | null = null;

notesForSubject.forEach(note => {
  const evalType = note.evaluation.type.toLowerCase();
  const evalLibelle = (note.evaluation.libelle || '').toLowerCase();
  
  // Matching flexible comme dans StudentGrades
  if (evalType.includes('devoir')) {
    if (evalLibelle.includes('1') || evalLibelle.includes(termConfig.devoir1.toLowerCase())) {
      devoir1Note = note.note;
    } else if (evalLibelle.includes('2') || evalLibelle.includes(termConfig.devoir2.toLowerCase())) {
      devoir2Note = note.note;
    }
  } else if (evalType.includes('composition') || evalType.includes('compo')) {
    compositionNote = note.note;
  }
});

         // Fallback si pas trouvé par libellé
if (devoir1Note === null) {
  const devoirNotes = notesForSubject
    .filter(n => n.evaluation.type.toLowerCase().includes('devoir'))
    .map(n => n.note);
  if (devoirNotes.length >= 2) {
    devoir1Note = devoirNotes[0];
    devoir2Note = devoirNotes[1];
  }
}

if (compositionNote === null) {
  const compoNote = notesForSubject
    .find(n => n.evaluation.type.toLowerCase().includes('composition'));
  if (compoNote) compositionNote = compoNote.note;
}

          // Calcul de la moyenne comme dans StudentGrades
          let subjectAverage: number | null = null;
          let weightedHomeworkAverage: number | null = null;

          if (devoir1Note !== null && devoir2Note !== null && compositionNote !== null) {
            const avgDevoirs = (devoir1Note + devoir2Note) / 2;
            weightedHomeworkAverage = parseFloat(avgDevoirs.toFixed(2));

            const currentTrimestreNumero = parseInt(currentTerm.nom.replace('Trimestre ', ''), 10);
            if (currentTrimestreNumero === 1) {
              subjectAverage = (avgDevoirs * 3 + compositionNote) / 4;
            } else if (currentTrimestreNumero === 2) {
              // Cherche la note de compo du T1
            
              let compoT1Note = null;
              if (term1) {
                const compoT1Note = allNotes.find(n =>
  n.etudiant.id === eleve.id &&
  n.evaluation.matiere_id === matiere.id &&
  n.evaluation.trimestre === term1?.id &&
  (n.evaluation.libelle || '').toLowerCase().includes(termEvaluationMap["Trimestre 1"].composition.toLowerCase())
)?.note ?? null;

               
              }
              if (compoT1Note !== null) {
                subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note) / 5;
              }
            } else if (currentTrimestreNumero === 3) {
              // Cherche compo T1 et T2
              
              let compoT1Note = null, compoT2Note = null;
              if (term1) {
               const compoT1Note = allNotes.find(n =>
  n.etudiant.id === eleve.id &&
  n.evaluation.matiere_id === matiere.id &&
  n.evaluation.trimestre === term1?.id &&
  (n.evaluation.libelle || '').toLowerCase().includes(termEvaluationMap["Trimestre 1"].composition.toLowerCase())
)?.note ?? null;

              }
              if (term2) {
                const compoT2Eval = allNotes.find(n =>
                  n.etudiant.id === eleve.id &&
                  n.evaluation.matiere_id === matiere.id &&
                  n.evaluation.trimestre === term2.id &&
                  ((n.evaluation.libelle || '').toLowerCase() === termEvaluationMap["Trimestre 2"].composition.toLowerCase())
                );
                compoT2Note = compoT2Eval?.note ?? null;
              }
              if (compoT1Note !== null && compoT2Note !== null) {
                subjectAverage = (avgDevoirs * 3 + compositionNote + compoT1Note + compoT2Note) / 6;
              }
            }
          }

          return {
            matiere: matiere.nom,
            coefficient,
            notesEvaluations: [
              {
                id: 0,
                type: 'Devoir',
                libelle: termConfig.devoir1,
                note: devoir1Note !== null ? devoir1Note : '00'
              },
              {
                id: 0,
                type: 'Devoir',
                libelle: termConfig.devoir2,
                note: devoir2Note !== null ? devoir2Note : '00'
              },
              {
                id: 0,
                type: 'Composition',
                libelle: termConfig.composition,
                note: compositionNote !== null ? compositionNote : '00'
              }
            ],
            moyenneMatiere: subjectAverage !== null ? parseFloat(subjectAverage.toFixed(2)) : 0,
            moyenneDevoirsPonderee: weightedHomeworkAverage, // This can be null
            appreciation: getAppreciation(subjectAverage !== null ? subjectAverage : 0)
          };
        });

        // Moyenne générale pondérée
        const overallAvg = calculateGeneralAverage(
          matieresDetails.map(m => ({
            finalAverage: m.moyenneMatiere,
            coefficient: m.coefficient,
            subjectName: m.matiere
          }))
        );

        return {
          id: eleve.id,
          name: `${eleve.prenom} ${eleve.nom}`,
          avg: overallAvg.toFixed(2),
          rank: '',
          teacherComment: getTeacherComment(overallAvg),
          principalComment: "",
          notesParMatiere: matieresDetails,
          absencesNonJustifieesHeures: parseFloat(totalHeuresAbsenceNonJustifiees.toFixed(1)),
          totalElevesClasse: eleves.length
        } as BulletinEleve;
      });

      const generatedBulletins = await Promise.all(bulletinsPromises);
      const validBulletins = generatedBulletins.filter(b => !isNaN(parseFloat(b.avg)));

      if (validBulletins.length > 0) {
        validBulletins.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
        validBulletins.forEach((bulletin, index) => {
          bulletin.rank = `${index + 1}/${validBulletins.length}`;
        });
        setBulletins(validBulletins);
      } else {
        setBulletins([]);
      }
    } catch (error) {
      console.error("Error generating bulletins:", error);
      toast({
        title: t.common.error,
        description: t.reports.generationError,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedAnneeAcademiqueId, selectedTermId, eleves, matieres, coefficients, allNotes, trimestres, t]);

  useEffect(() => {
    generateBulletins();
  }, [generateBulletins]);

  const filteredBulletins = useMemo(() => {
    return bulletins.filter(bulletin =>
      bulletin.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [bulletins, debouncedSearchQuery]);

  const handlePreviewReport = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    setPreviewOpen(true);
  };

  const printAllReports = () => {
    if (bulletins.length === 0) {
      toast({
        title: t.common.error,
        description: t.reports.noReportsToPrint,
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let allReportsHtml = '';
      bulletins.forEach((bulletin) => {
        const reportHtml = ReactDOMServer.renderToString(
          <PrintableReport
            report={bulletin}
            establishmentInfo={{ schoolName, address, phone, website }}
            selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
            selectedTerm={getTranslatedTerm(trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || '')}
            selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
            dynamicEvaluationHeaders={dynamicEvaluationHeaders}
            getMention={getMention}
          />
        );
        allReportsHtml += `<div class="page-break">${reportHtml}</div>`;
      });

      printWindow.document.write(`
        <html>
        <head>
          <title>${t.reports.title} - ${classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}</title>
          <style>
            @page {
              margin: 10px;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              ${isRTL ? 'direction: rtl;' : ''}
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body ${isRTL ? 'dir="rtl"' : ''}>
          ${allReportsHtml}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const exportPreviewedReport = () => {
    if (!selectedReport) return;
    toast({
      title: t.reports.exportPDF,
      description: t.reports.exportingReport.replace('{name}', selectedReport.name),
    });
  };

  const printPreviewedReport = () => {
    if (!selectedReport) return;
    window.print();
  };

  const getMention = (moyenne: number): string => {
    if (moyenne >= 16) return t.reportManagement.mentions.excellent;
    if (moyenne >= 14) return t.reportManagement.mentions.veryGood;
    if (moyenne >= 12) return t.reportManagement.mentions.good;
    if (moyenne >= 10) return t.reportManagement.mentions.fair;
    if (moyenne >= 8) return t.reportManagement.mentions.encouragement;
    return t.reportManagement.mentions.warning;
  };

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;

  const printReportFromRow = (bulletin: BulletinEleve) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Bulletin scolaire - ${bulletin.name}</title>
          <meta charset="UTF-8">
          <style>
            @page {
              size: A4 landscape;
              margin: 15mm;
            }
            body {
              font-family: 'Times New Roman', serif;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-container {
              width: 297mm;
              height: 210mm;
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${ReactDOMServer.renderToString(
              <PrintableReport
                report={bulletin}
                establishmentInfo={{ schoolName, address, phone, website }}
                selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
                selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
                selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
                dynamicEvaluationHeaders={dynamicEvaluationHeaders}
                getMention={getMention}
              />
            )}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  // ... tout le code JSX du composant inchangé ...

  // Place ici ton rendu (le code JSX principal) inchangé

  
 return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-4">
      {t.reports.title}
    </h1>

      {/* Formulaire de sélection */}
      <Card className="mb-8 shadow-lg rounded-lg dark:border dark:border-gray-700">
  <CardHeader className="bg-blue-600 dark:bg-blue-800 text-white rounded-t-lg p-4">
    <CardTitle className="text-2xl font-bold text-white">
      {t.reports.selectionTitle}
    </CardTitle>
    <CardDescription className="text-blue-100 dark:text-blue-200">
      {t.reports.selectionDescription}
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sélecteur d'année scolaire */}
            <div className="space-y-2">
             <label htmlFor="annee-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.common.schoolYear}
        </label>
              <Select 
                onValueChange={setSelectedAnneeAcademiqueId} 
                value={selectedAnneeAcademiqueId}
              >
                  <SelectTrigger id="annee-select" className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder={t.common.selectAYear} />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {anneesAcademiques.map((annee) => (
                     <SelectItem key={annee.id} value={annee.id.toString()} className="dark:hover:bg-gray-700">
                {annee.libelle}
              </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de classe */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.class}
              </label>
              <Select
                onValueChange={setSelectedClassId}
                value={selectedClassId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
                  <SelectValue placeholder={t.common.selectAClass} />
                </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="dark:hover:bg-gray-700">
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de trimestre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.trimester}
              </label>
              <Select
                onValueChange={setSelectedTermId}
                value={selectedTermId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
                  <SelectValue placeholder={t.common.selectATrimester} />
                </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {trimestres.map((trimestre) => (
                    <SelectItem key={trimestre.id} value={trimestre.id.toString()} className="dark:hover:bg-gray-700">
  {getTranslatedTerm(trimestre.nom)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {isFormComplete ? (
        <div className="space-y-8">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">            <Button
              onClick={printAllReports}
              disabled={isLoading || bulletins.length === 0}
        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-md px-6 py-3 text-base rounded-md"
            >
              <Printer className="mr-3 h-5 w-5" />
              {t.reports.printAllReports}
            </Button>

            <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={t.reports.searchStudent}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

    <Card className="shadow-lg rounded-lg dark:border dark:border-gray-700">
            <CardContent className="p-0">
              {isLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300 mx-auto mb-4"></div>
                  {t.common.loading}
                </div>
              ) : filteredBulletins.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">
                  {searchQuery ? (
                    <p>{t.reports.noStudentFound}</p>
                  ) : (
                    <>
                      <p>{t.reports.noStudentOrGrade}</p>
                      <p className="mt-2 text-sm">{t.reports.noStudentOrGradeHint}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Vue desktop */}
            <div className="hidden lg:block rounded-lg dark:bg-gray-800" style={{ maxHeight: "40vh", overflowY: "auto", overflowX: "auto" }}>
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader className="bg-gray-100 dark:bg-gray-700">
                        <TableRow>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.student}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.reportManagement.overallAverage}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.reportManagement.rank}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.status.general}
                          </TableHead>
                          <TableHead className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.actions}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredBulletins.map((bulletin) => (
                    <TableRow key={bulletin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.name}
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.avg}/20
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.rank}
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              <Badge className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {t.reports.generated}
                              </Badge>
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewReport(bulletin)}
                                  className="text-blue-600 hover:bg-blue-50 rounded-md"
                                >
                                  <Eye className="h-4 w-4 mr-1" /> {t.reports.preview}
                                </Button>
                                <Button 
                                  onClick={() => printReportFromRow(bulletin)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Printer className="h-4 w-4 mr-1" /> {t.common.print}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vue mobile */}
                  <div
                    className="block lg:hidden space-y-2 p-2 bg-white rounded-md"
                    style={{
                      height: 'calc(81vh - 180px)',
                      overflowY: 'auto',
                    }}
                  >
                    {filteredBulletins.map((bulletin) => (
                      <Card key={bulletin.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
                            {bulletin.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm border-t border-b py-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.reportManagement.overallAverage}:
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                              {bulletin.avg}/20
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.reportManagement.rank}:
                            </span>
                            <span className="text-gray-800 dark:text-gray-100">{bulletin.rank}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.common.status.general}:
                            </span>
                            <Badge className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              {t.reports.generated}
                            </Badge>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewReport(bulletin)}
                            className="text-blue-600 hover:bg-blue-50 rounded-md flex-1 justify-center"
                          >
                            <Eye className="h-4 w-4 mr-1" /> {t.reports.preview}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printReportFromRow(bulletin)}
                            className="text-red-600 hover:bg-red-50 rounded-md"
                          >
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
  <div className="bg-white dark:bg-gray-800 rounded-lg p-10 text-center shadow-lg border border-gray-200 dark:border-gray-700">
    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
            {t.reports.selectPrompt}
          </p>
    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            {t.reports.useDropdowns}
          </p>
        </div>
      )}

      {/* Dialogue de prévisualisation */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
<DialogContent className="max-w-6xl w-full p-0 rounded-lg overflow-hidden h-[calc(100vh-2rem)] print:h-[297mm] print:max-h-[297mm] print:rounded-none print:shadow-none print:border-none dark:bg-gray-900">
          {/* Contenu imprimable */}
          {selectedReport && (
            <div 
              id="bulletin-preview-content-area" 
      className="bg-white dark:bg-gray-800 h-full overflow-y-auto px-8 pt-8 pb-8 print:p-[8mm] print:overflow-visible print:h-auto print:border print:border-gray-300 print:shadow-md print:rounded-md"
              dir="ltr"
            >
              {/* En-tête */}
              <div className="grid grid-cols-3 items-center gap-4 text-xs mb-6 print:mb-4">
                <div className="text-left">
                  <p>{t.reportManagement.republic}</p>
                  <p>{t.reportManagement.educationMinistry}</p>
                  <p>{t.reportManagement.examsDirection}</p>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-blue-800 mb-1">
                    {t.reportManagement.reportTitle}
                  </h2>
                  <p className="font-semibold text-sm">
                    {t.reportManagement.schoolYear}:{" "}
                    <span className="text-blue-700">
                      {anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}
                    </span>
                  </p>
                  <p className="font-semibold text-sm">
                    {t.reportManagement.term}:{" "}
                    <span className="text-blue-700">
                      {trimestres.find(t => t.id === parseInt(selectedTermId))?.nom}
                    </span>
                  </p>
                </div>
                <div className="text-right text-xs" dir="rtl">
                  <p>{t.reportManagement.republicAr}</p>
                  <p>{t.reportManagement.educationMinistryAr}</p>
                  <p>{t.reportManagement.examsDirectionAr}</p>
                </div>
              </div>

              {/* Info élève */}
              <div className="mb-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <p><strong>{t.reportManagement.establishment}:</strong> {schoolName}</p>
                    <p><strong>{t.common.student}:</strong> {selectedReport.name}</p>
                    <p><strong>{t.reportManagement.studentId}:</strong> 123456</p>
                  </div>
                  <div className="text-right md:pl-8">
                    <p><strong>{t.common.class}:</strong> {classes.find(c => c.id === parseInt(selectedClassId))?.nom}</p>
                    <p><strong>{t.reportManagement.studentsCount}:</strong> {selectedReport.totalElevesClasse}</p>
                    <p>
                      <strong>{t.reportManagement.unjustifiedAbsences}:</strong>{" "}
                      <span className="text-red-600">{selectedReport.absencesNonJustifieesHeures ?? 0} {t.common.hourse}</span>
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-2 text-right text-xs">
                  {t.reportManagement.printDate}: {new Date().toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                </div>
              </div>

              {/* Tableau des notes */}
              <div className="mb-6 overflow-x-auto text-xs print:text-xs">
                <Table className="w-full border border-gray-300 print:border print:border-gray-400 print:border-collapse">
                  <TableHeader className="bg-blue-100 print:bg-gray-100">
                    <TableRow>
                      <TableHead className="min-w-[150px]">
                        {t.reportManagement.subject}<br />
                        <span className="text-sm">{t.reportManagement.subjectAr}</span>
                      </TableHead>
                      <TableHead className="text-center">
                        {t.reportManagement.coefficient}<br />
                        <span className="text-sm">{t.reportManagement.coefficientAr}</span>
                      </TableHead>
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center">
                            {header}<br />
                            <span className="text-sm">
                              {header.toLowerCase().includes('devoir') ? t.reportManagement.testAr : ''}
                            </span>
                          </TableHead>
                        ))}
                      
                      {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                        <TableHead key="moy-dev-pond-header" className="text-center">
                          {t.reportManagement.weightedTestAvg}<br />
                          <span className="text-sm">{t.reportManagement.weightedTestAvgAr}</span>
                        </TableHead>
                      )}
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center min-w-[120px]">
                            {header.toLowerCase().startsWith('compo')
                              ? `${t.reportManagement.exam} ${header.replace(/composition\s*/i, '')}`
                              : header}
                            <br />
                            {header.toLowerCase().startsWith('compo')
                                ? `${t.reportManagement.examAr} ${header.replace(/composition\s*/i, '')}`
                                : ''}
                          </TableHead>
                        ))}
                      
                      <TableHead className="text-center">
                        {t.reportManagement.subjectAvg}<br />
                        <span className="text-sm">{t.reportManagement.subjectAvgAr}</span>
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        {t.reportManagement.observation}<br />
                        <span className="text-sm">{t.reportManagement.observationAr}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {selectedReport.notesParMatiere.map(matiere => (
                      <TableRow key={matiere.matiere} className="even:bg-gray-50 print:even:bg-white">
                        <TableCell>{matiere.matiere}</TableCell>
                        <TableCell className="text-center">{matiere.coefficient}</TableCell>
                        {dynamicEvaluationHeaders
                          .filter(header => header.toLowerCase().includes('devoir'))
                          .map(header => {
                            const note = matiere.notesEvaluations.find(n => n.libelle === header);
                            return (
                              <TableCell key={`${matiere.matiere}-${header}-devoir`} className="text-center">
                                {note ? note.note : "00"}
                              </TableCell>
                            );
                          })}
                        
                        {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                          <TableCell key={`${matiere.matiere}-moy-dev-pond`} className="text-center">
                            {matiere.moyenneDevoirsPonderee != null ? matiere.moyenneDevoirsPonderee.toFixed(2) : '-'}
                          </TableCell>
                        )}
                        
                        {dynamicEvaluationHeaders
                          .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                          .map(header => {
                            const note = matiere.notesEvaluations.find(n => n.libelle === header);
                            return (
                              <TableCell key={`${matiere.matiere}-${header}-compo`} className="text-center">
                                {note ? note.note : "00"}
                              </TableCell>
                            );
                          })}

                        <TableCell className="text-center font-bold">{matiere.moyenneMatiere.toFixed(2)}</TableCell>
                        <TableCell className="observation-column" style={{ textAlign: isRTL ? 'right' : 'left', paddingLeft: '16px' }}></TableCell>
                      </TableRow>
                    ))}

                    {/* Ligne des totaux */}
                    <TableRow className="bg-gray-50 font-bold print:bg-gray-100">
                      <TableCell>{t.reportManagement.totals}</TableCell>
                      <TableCell className="text-center">
                        {selectedReport.notesParMatiere.reduce((sum, matiere) => sum + matiere.coefficient, 0).toFixed(0)}
                      </TableCell>
                      <TableCell colSpan={dynamicEvaluationHeaders.length + 1}></TableCell>
                      <TableCell className="text-center">
                        {selectedReport.notesParMatiere
                          .reduce((sum, matiere) => sum + (matiere.moyenneMatiere * matiere.coefficient), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Observations & Résultats */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:text-sm">
                <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
                  <h3 className="font-bold mb-2">{t.reportManagement.classCouncilAppreciation}</h3>
                  <p className="italic">{selectedReport.teacherComment}</p>
                  <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t.reportManagement.teacherSignature}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
                  <h3 className="font-bold mb-2">{t.reportManagement.directorObservations}</h3>
                  <p className="italic">{selectedReport.principalComment}</p>
                  <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t.reportManagement.directorSignature}
                  </p>
                </div>
              </div>

              {/* Résultats finaux */}
              <div className="mb-6 text-center grid grid-cols-2 md:grid-cols-4 gap-6 print:text-sm bg-gray-50 p-5 rounded-lg shadow-md">
                {[{
                  label: t.reportManagement.overallAverage,
                  value: `${selectedReport.avg}/20`,
                  textColor: "text-blue-700"
                }, {
                  label: t.reportManagement.rank,
                  value: selectedReport.rank,
                  textColor: "text-gray-900"
                }, {
                  label: t.reportManagement.mention,
                  value: getMention(parseFloat(selectedReport.avg)),
                  textColor: "text-indigo-600"
                }, {
                  label: t.reportManagement.decision,
                  value: parseFloat(selectedReport.avg) >= 10 ? t.reportManagement.passed : t.reportManagement.failed,
                  textColor: parseFloat(selectedReport.avg) >= 10 ? "text-green-600" : "text-red-600"
                }].map(({label, value, textColor}) => (
                  <div key={label} className="flex flex-col items-center">
                    <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide">{label}</p>
                    <p className={`text-2xl font-extrabold ${textColor}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Pied de page */}
              <div className="text-center text-xs text-gray-500 pt-2 pb-6 print:pb-0 print:text-xs">
                <p className="mt-2">{t.reportManagement.adminStamp}</p>
                <p className="mt-2">
                  {schoolName} - {address}
                  {phone && ` - ${t.common.phone}: ${phone}`}
                  {website && ` - ${t.common.website}: ${website}`}
                </p>
              </div>
            </div>
          )}

          {/* Actions non imprimables */}
  <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 flex justify-end gap-4 rounded-b-lg no-print">
    <Button variant="outline" onClick={() => setPreviewOpen(false)} className="dark:border-gray-600 dark:text-white">
              {t.common.close}
            </Button>
            <Button 
              onClick={exportPreviewedReport} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileDown className="mr-2 h-4 w-4" /> {t.reports.exportPDF}
            </Button>
            <Button 
              onClick={printPreviewedReport} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" /> {t.common.print}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}