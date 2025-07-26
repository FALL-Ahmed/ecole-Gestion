import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PrintableReport } from '@/components/PrintableReport';
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
import { useLanguage } from '@/contexts/LanguageContext';

import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, Search, Eye, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { useDebounce } from 'use-debounce';
import ReactDOMServer from 'react-dom/server';
import apiClient from '@/lib/apiClient';
import { format, parseISO } from 'date-fns';

import { calculateGeneralAverage, termEvaluationMap } from '../../lib/grades';

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
  type: string;
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
    type: string;
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
  matiereArabe?: string;
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

const fetchApiData = async (endpoint: string, params?: Record<string, any>) => {
  try {
    const response = await apiClient.get(`/${endpoint}`, { params });
    return response.data;
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
  // Correction: Utilisation des noms de paramètres corrects (camelCase) attendus par le backend.
  const inscriptions = await fetchApiData('inscriptions', {
    classeId: classeId.toString(),
    anneeScolaireId: anneeScolaireId.toString()
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

const fetchTaughtSubjectsAndCoefficients = async (classeId: number, anneeScolaireId: number) => {
  // 1. Obtenir toutes les matières enseignées dans la classe pour l'année à partir des affectations
  const affectations = await fetchApiData('affectations', {
    classe_id: classeId.toString(),
    annee_scolaire_id: anneeScolaireId.toString()
  });

  const taughtMatieresMap = new Map<number, Matiere>();
  affectations.forEach((aff: any) => {
    if (aff.matiere && aff.matiere.id) {
      taughtMatieresMap.set(aff.matiere.id, aff.matiere);
    }
  });
  const taughtMatieres = Array.from(taughtMatieresMap.values());

  // 2. Obtenir tous les coefficients pour la classe
  const coefficientsData = await fetchApiData('coefficientclasse', {
    classe_id: classeId.toString()
  });

  return {
    matieres: taughtMatieres,
    coefficients: coefficientsData.map((cc: any) => ({ id: cc.id, matiere_id: cc.matiere?.id || cc.matiere_id, classe_id: cc.classe?.id || cc.classe_id, coefficient: parseFloat(cc.coefficient) }))
  };
};

const fetchTrimestresByAnneeAcademique = (anneeAcademiqueId: number) =>
  fetchApiData('trimestres', {
    anneeScolaireId: anneeAcademiqueId.toString()
  });

const fetchEvaluationsForClassAndYear = async (classeId: number, anneeScolaireId: number, trimestres: Trimestre[]) => {
  const params = {
    classe_id: classeId.toString(),
    annee_scolaire_id: anneeScolaireId.toString()
  };

  const data = await fetchApiData('evaluations', params);
  return data.map((evalItem: any) => {
    const term = trimestres.find(t => 
      new Date(evalItem.date_eval) >= new Date(t.date_debut) && 
      new Date(evalItem.date_eval) <= new Date(t.date_fin)
    );
    
    return {
      id: evalItem.id,
      matiere_id: evalItem.matiere?.id || evalItem.matiere_id,
      matiere: evalItem.matiere,
      classe_id: evalItem.classe_id,
      professeur_id: evalItem.professeur_id,
      type: evalItem.type,
      date_eval: evalItem.date_eval,
      trimestre: term ? parseInt(term.nom.replace('Trimestre ', '')) : 1,
      annee_scolaire_id: evalItem.annee_scolaire_id,
      libelle: evalItem.type
    };
  });
};
const fetchNotesForEvaluations = async (evaluationIds: number[], etudiantId?: number): Promise<Note[]> => {
  if (evaluationIds.length === 0) return [];

  try {
    // On récupère toutes les notes et on filtre côté client, comme dans les autres composants.
    const response = await apiClient.get('/notes', {
      params: {
        '_expand': 'evaluation,etudiant'
      }
    });
    const allNotesFromApi = response.data;
    console.log(`[fetchNotesForEvaluations] ${allNotesFromApi.length} notes récupérées depuis l'API avant le filtrage.`);

    // Filtrage côté client
    const filteredNotes = allNotesFromApi.filter((note: any) => {
      const evalId = note.evaluation?.id || note.evaluationId;
      const studId = note.etudiant?.id || note.etudiant_id;

      const evaluationMatch = evaluationIds.includes(evalId);
      const studentMatch = !etudiantId || studId === etudiantId;

      return evaluationMatch && studentMatch;
    });

    console.log(`[fetchNotesForEvaluations] ${filteredNotes.length} notes restantes après filtrage pour les IDs d'évaluation:`, evaluationIds);
    return filteredNotes.map((item: any) => {
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
          type: evalData.type || 'Evaluation', // Conserver le type complet (ex: "Devoir 1")
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
  const [isOrientationDialogOpen, setIsOrientationDialogOpen] = useState(false);
  const [isSinglePrintDialogOpen, setIsSinglePrintDialogOpen] = useState(false);
  const [isPrintPending, setIsPrintPending] = useState(false); // Pour enchaîner les modales

  const [dynamicEvaluationHeaders, setDynamicEvaluationHeaders] = useState<string[]>([]);

  const getRankDetails = (rank: string) => {
    const rankNumber = parseInt(rank.split('/')[0], 10);
    if (isNaN(rankNumber)) return null;

    if (rankNumber === 1) {
      return { 
        icon: <Award className="h-5 w-5 text-amber-500" />, 
        rowClass: 'bg-amber-100 dark:bg-amber-900/30 border-l-4 border-amber-400',
        cardClass: 'border-2 border-amber-400 bg-amber-100 dark:bg-amber-900/30'
      };
    }
    if (rankNumber === 2) {
      return { 
        icon: <Award className="h-5 w-5 text-slate-500" />, 
        rowClass: 'bg-slate-100 dark:bg-slate-800/40 border-l-4 border-slate-400',
        cardClass: 'border-2 border-slate-400 bg-slate-100 dark:bg-slate-800/40'
      };
    }
    if (rankNumber === 3) {
      return { 
        icon: <Award className="h-5 w-5 text-orange-600" />, 
        rowClass: 'bg-orange-100 dark:bg-orange-900/30 border-l-4 border-orange-500',
        cardClass: 'border-2 border-orange-500 bg-orange-100 dark:bg-orange-900/30'
      };
    }
    return null;
  };

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
          fetchTaughtSubjectsAndCoefficients(classIdNum, anneeIdNum)
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
const allEvaluationsForYear = await fetchEvaluationsForClassAndYear(classIdNum, anneeIdNum, trimestres);
      // 2. Trouve le trimestre sélectionné
      const currentTerm = trimestres.find(t => t.id === currentTermId);
      if (!currentTerm) return;

      // 3. Filtre les évaluations pour le trimestre courant en utilisant les dates
      const evaluationsForCurrentTerm = allEvaluationsForYear.filter(e => {
        const evalDate = new Date(e.date_eval);
        return evalDate >= new Date(currentTerm.date_debut) && 
               evalDate <= new Date(currentTerm.date_fin);
      });

      setAllEvaluations(evaluationsForCurrentTerm);

      // 4. Récupère les notes pour TOUTES les évaluations de l'année
      const allEvaluationIdsForYear = allEvaluationsForYear.map(e => e.id);
      console.log("Tentative de récupération des notes pour les IDs d'évaluation:", allEvaluationIdsForYear);
      const notesData = await fetchNotesForEvaluations(allEvaluationIdsForYear);
      console.log("Notes finales stockées dans l'état 'allNotes':", notesData);
      setAllNotes(notesData);

      // 5. Mettre à jour les en-têtes de colonnes dynamiquement et dans le bon ordre
      const termNumber = parseInt(currentTerm.nom.replace(/\D/g, ''), 10);
      const devoirs: string[] = [];
      const compositions: string[] = [];

      // Ajouter les devoirs et la composition du trimestre actuel
      const currentTermConfig = termEvaluationMap[currentTerm.nom as keyof typeof termEvaluationMap];
      if (currentTermConfig) {
        devoirs.push(currentTermConfig.devoir1, currentTermConfig.devoir2);
        compositions.push(currentTermConfig.composition);
      }

      // Ajouter les compositions des trimestres précédents
      if (termNumber >= 2) {
        const prevTermConfig = termEvaluationMap['Trimestre 1'];
        if (prevTermConfig) compositions.push(prevTermConfig.composition);
      }
      if (termNumber >= 3) {
        const term2Config = termEvaluationMap['Trimestre 2'];
        if (term2Config) compositions.push(term2Config.composition);
      }

      // Trier les compositions par ordre numérique
      const sortedCompositions = [...new Set(compositions)].sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      // Concaténer les devoirs du trimestre, PUIS les compositions triées
      setDynamicEvaluationHeaders([...devoirs, ...sortedCompositions]);
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
  const currentTerm = trimestres.find(t => t.id === termIdNum);
  if (!classIdNum || !anneeIdNum || !termIdNum || !currentTerm) return;
  setIsLoading(true);

  try {
    // On récupère toutes les absences de l'année pour la classe sélectionnée.
    const allYearAbsences: AbsenceAPI[] = await fetchApiData('absences', {
      annee_scolaire_id: anneeIdNum.toString(),
      classe_id: classIdNum.toString(),
    });

    // On filtre ensuite ces absences côté client pour ne garder que celles du trimestre.
    const termStartDate = parseISO(currentTerm.date_debut);
    const termEndDate = parseISO(currentTerm.date_fin);
    const allTermAbsences = allYearAbsences.filter(abs => {
        const absDate = parseISO(abs.date);
        return absDate >= termStartDate && absDate <= termEndDate;
    });

    const bulletinsPromises = eleves.map(async (eleve) => {
      console.log(`%c[Bulletin] Traitement pour ${eleve.prenom} ${eleve.nom} (ID: ${eleve.id})`, 'color: #1e90ff; font-weight: bold;');
      // Absences
      const absencesEleve = allTermAbsences.filter(abs => abs.etudiant_id === eleve.id);
      let totalHeuresAbsenceNonJustifiees = 0;
      absencesEleve.forEach(absence => {
        // Correction : une absence est non justifiée si la colonne 'justification' est vide ou nulle.
        if (!absence.justification || absence.justification.trim() === '') {
          const heures = calculateDurationInHours(absence.heure_debut, absence.heure_fin);
          totalHeuresAbsenceNonJustifiees += heures;
        }
      });

      const termNumber = parseInt(currentTerm.nom.replace('Trimestre ', ''));
      const termConfig = termEvaluationMap[currentTerm.nom as keyof typeof termEvaluationMap];

      // Tri des matières selon l'ordre spécifié
      const subjectOrder = [
        'Arabe',
        'Éducation Islamique',
        'Mathématiques',
        'Français',
        'Anglais',
        'Sciences Naturelles',
        'Physique Chimie',
      ];

      const sortedMatieres = [...matieres].sort((a, b) => {
        const indexA = subjectOrder.indexOf(a.nom);
        const indexB = subjectOrder.indexOf(b.nom);

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.nom.localeCompare(b.nom);
      });
      // Notes par matière
      const subjectTranslationMap: { [key: string]: string } = {
        'Arabe': 'اللغة العربية',
        'Éducation Islamique': 'التربية الإسلامية',
        'Mathématiques': 'الرياضيات',
        'Français': 'اللغة الفرنسية',
        'Anglais': 'اللغة الإنجليزية',
        'Sciences Naturelles': 'علوم الطبيعة والحياة',
        'Physique Chimie': 'الفيزياء والكيمياء',
        'Histoire Géographie': 'التاريخ والجغرافيا',
        'Éducation Civique': 'التربية المدنية',
        'Éducation Physique et Sportive': 'التربية البدنية والرياضية',
        'Philosophie': 'الفلسفة',
        'Technologie/Informatique': 'التكنولوجيا/الإعلام الآلي',
      };

      const matieresDetails = sortedMatieres.map((matiere) => {
        const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;
        const matiereId = matiere.id;
        
        // Génère dynamiquement les évaluations attendues
       const notesEvaluations = dynamicEvaluationHeaders.map((header) => {
          // On cherche la note correspondante dans TOUTES les notes de l'année,
          // pas seulement celles du trimestre courant.
          const noteObj = allNotes.find(note => {
            const studentMatch = Number(note.etudiant.id) === Number(eleve.id);
            const noteMatiereId = note.evaluation.matiere?.id ?? note.evaluation.matiere_id;
            const subjectMatch = Number(noteMatiereId) === Number(matiereId);

            const evalType = note.evaluation.type?.trim().toLowerCase();
            const evalLibelle = note.evaluation.libelle?.trim().toLowerCase();
            const headerLower = header.trim().toLowerCase();
            const headerMatch = evalType === headerLower || evalLibelle === headerLower;

            return studentMatch && subjectMatch && headerMatch;
          });
  
  return {
    id: noteObj?.id || 0,
    type: header.toLowerCase().includes('composition') ? 'Composition' : 'Devoir',
    libelle: header,
    note: noteObj ? noteObj.note : '00'
  };
});

        console.log(`[Bulletin] Matière: ${matiere.nom} - Structure des notes pour le bulletin:`, notesEvaluations);

        // Calcul dynamique de la moyenne
        const devoirNotes = notesEvaluations
          .filter(ev => ev.type === 'Devoir' && typeof ev.note === 'number')
          .map(ev => Number(ev.note));
        const avgDevoirs = devoirNotes.length > 0
          ? devoirNotes.reduce((sum, n) => sum + n, 0) / devoirNotes.length
          : null;

        // Correction: Trouver la composition du trimestre ACTUEL, pas la première de la liste.
        // Le nom de la composition du trimestre actuel est dans termConfig.
        const currentTermCompositionName = termConfig.composition;
        const compositionEval = notesEvaluations.find(ev => ev.libelle === currentTermCompositionName);
        const compositionNote = compositionEval && typeof compositionEval.note === 'number'
          ? Number(compositionEval.note)
          : null;

        let subjectAverage: number | null = null;
        if (termNumber === 1) {
          let somme = 0, poids = 0;
          if (avgDevoirs !== null) { somme += avgDevoirs * 3; poids += 3; }
          if (compositionNote !== null) { somme += compositionNote; poids += 1; }
          subjectAverage = poids > 0 ? somme / poids : null;
        } else if (termNumber === 2) {
          // Ajoute la composition du T1 si elle existe
         const term1 = trimestres.find(t => t.nom === "Trimestre 1");
const compoT1NoteObj = term1 ? allNotes.find(n =>
  n.etudiant.id === eleve.id &&
  (n.evaluation.matiere?.id === matiereId || n.evaluation.matiere_id === matiereId) &&
  new Date(n.evaluation.date_eval) >= new Date(term1.date_debut) && 
  new Date(n.evaluation.date_eval) <= new Date(term1.date_fin) &&
  (n.evaluation.type?.trim().toLowerCase().includes('composition') || 
   n.evaluation.libelle?.trim().toLowerCase().includes('composition'))
) : null;
const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;

          let somme = 0, poids = 0;
          if (avgDevoirs !== null) { somme += avgDevoirs * 3; poids += 3; }
          if (compositionNote !== null) { somme += compositionNote * 2; poids += 2; }
          if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
          subjectAverage = poids > 0 ? somme / poids : null;
        } else if (termNumber === 3) {
          // Ajoute les compositions des T1 et T2 si elles existent
          const term1 = trimestres.find(t => t.nom === "Trimestre 1");
const term2 = trimestres.find(t => t.nom === "Trimestre 2");

const compoT1NoteObj = term1 ? allNotes.find(n =>
  n.etudiant.id === eleve.id &&
  (n.evaluation.matiere?.id === matiereId || n.evaluation.matiere_id === matiereId) &&
  new Date(n.evaluation.date_eval) >= new Date(term1.date_debut) && 
  new Date(n.evaluation.date_eval) <= new Date(term1.date_fin) &&
  (n.evaluation.type?.trim().toLowerCase().includes('composition') || 
   n.evaluation.libelle?.trim().toLowerCase().includes('composition'))
) : null;

const compoT2NoteObj = term2 ? allNotes.find(n =>
  n.etudiant.id === eleve.id &&
  (n.evaluation.matiere?.id === matiereId || n.evaluation.matiere_id === matiereId) &&
  new Date(n.evaluation.date_eval) >= new Date(term2.date_debut) && 
  new Date(n.evaluation.date_eval) <= new Date(term2.date_fin) &&
  (n.evaluation.type?.trim().toLowerCase().includes('composition') || 
   n.evaluation.libelle?.trim().toLowerCase().includes('composition'))
) : null;

const compoT1Note = compoT1NoteObj ? compoT1NoteObj.note : null;
const compoT2Note = compoT2NoteObj ? compoT2NoteObj.note : null;

let somme = 0, poids = 0;
if (avgDevoirs !== null) { somme += avgDevoirs * 3; poids += 3; }
if (compositionNote !== null) { somme += compositionNote * 3; poids += 3; }
if (compoT1Note !== null) { somme += compoT1Note; poids += 1; }
if (compoT2Note !== null) { somme += compoT2Note * 2; poids += 2; }
subjectAverage = poids > 0 ? somme / poids : null;
        }

        if (subjectAverage !== null) {
          subjectAverage = parseFloat(subjectAverage.toFixed(2));
        }

        return {
          matiere: matiere.nom,
          matiereArabe: subjectTranslationMap[matiere.nom] || matiere.nom,
          coefficient,
          notesEvaluations,
          moyenneMatiere: subjectAverage !== null ? subjectAverage : 0,
          moyenneDevoirsPonderee: avgDevoirs,
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
}, [selectedClassId, selectedAnneeAcademiqueId, selectedTermId, eleves, matieres, coefficients, allNotes, trimestres, t, dynamicEvaluationHeaders]);
 


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

 const printAllReports = async (orientation: 'portrait' | 'landscape') => {
  if (bulletins.length === 0) {
    toast({
      title: t.common.error,
      description: t.reports.noReportsToPrint,
      variant: "destructive",
    });
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // Récupérer les styles CSS
  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
    .map(el => el.outerHTML)
    .join('\n');

  // Préparer le HTML de base
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${t.reports.title}</title>
      ${styles}
      <style>
        @page {
          size: A4 ${orientation};
          margin: 10mm;
        }
        .bulletin-container {
          page-break-after: always;
        }
        .bulletin-container:last-child {
          page-break-after: auto;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body ${isRTL ? 'dir="rtl"' : ''} style="font-family: Arial, sans-serif; margin: 0;">
  `;

  // Générer le HTML pour chaque bulletin
  bulletins.forEach(bulletin => {
    const reportComponent = (
      <PrintableReport
        report={bulletin}
        establishmentInfo={{ schoolName, address, phone, website }}
        selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
        selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
        selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
        dynamicEvaluationHeaders={dynamicEvaluationHeaders}
        getMention={getMention}
        t={t}
        isRTL={isRTL}
      />
    );
    
    // Utiliser renderToStaticMarkup pour chaque bulletin individuellement
    html += `<div class="bulletin-container">${ReactDOMServer.renderToStaticMarkup(reportComponent)}</div>`;
  });

  html += `
      <script>
        setTimeout(() => {
          window.print();
          window.close();
        }, 500);
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};


  const exportPreviewedReport = () => {
    if (!selectedReport) return;
    toast({
      title: t.reports.exportPDF,
      description: t.reports.exportingReport.replace('{name}', selectedReport.name),
    });
  };

  const printPreviewedReport = (orientation: 'portrait' | 'landscape') => {
    if (!selectedReport) return;
const printWindow = window.open('', '_blank');
    if (printWindow) {
      const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const reportHtml = ReactDOMServer.renderToString(
        <PrintableReport
          report={selectedReport}
          establishmentInfo={{ schoolName, address, phone, website }}
          selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
          selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
          selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
          dynamicEvaluationHeaders={dynamicEvaluationHeaders}
          getMention={getMention}
          t={t}
          isRTL={isRTL}
        />
      );

      printWindow.document.write(`
        <html>
        <head>
          <title>${t.reports.title} - ${selectedReport.name}</title>
          ${styles}
          <style>
            @page { size: A4 ${orientation}; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; ${isRTL ? 'direction: rtl;' : ''} }
            .no-print { display: none !important; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body ${isRTL ? 'dir="rtl"' : ''}>
          <div>${reportHtml}</div>
          <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handlePreviewOpenChange = (isOpen: boolean) => {
    if (!isOpen && isPrintPending) {
      // Si la modale de prévisualisation se ferme ET qu'une impression est en attente,
      // on ouvre la modale de choix d'orientation.
      setIsSinglePrintDialogOpen(true);
      setIsPrintPending(false); // Réinitialiser le drapeau
    }
    setPreviewOpen(isOpen);
  };

  const handlePrintFromPreviewClick = () => {
    if (!selectedReport) return;
    if (selectedTermId === '6' || selectedTermId === '5') {
      printPreviewedReport('landscape');
      setPreviewOpen(false);
    } else {
      setIsPrintPending(true);
      setPreviewOpen(false);
    }
  };

  const handlePrintAllClick = () => {
    if (bulletins.length === 0) {
      toast({
        title: t.common.error,
        description: t.reports.noReportsToPrint,
        variant: "destructive",
      });
      return;
    }
    if (selectedTermId === '6' || selectedTermId === '5') {
      printAllReports('landscape');
    } else {
      setIsOrientationDialogOpen(true);
    }
  };

  const handlePrintFromRowClick = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    if (selectedTermId === '6' || selectedTermId === '5') {
      // The `printPreviewedReport` function uses the `selectedReport` state, which we just set.
      printPreviewedReport('landscape');
    } else {
      setIsSinglePrintDialogOpen(true);
    }
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
              onClick={handlePrintAllClick}
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
                          (() => {
                            const rankDetails = getRankDetails(bulletin.rank);
                            return (
                              <TableRow key={bulletin.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150 ${rankDetails?.rowClass || ''}`}>
                                <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                  <div className="flex items-center gap-2">
                                    {rankDetails?.icon}
                                    {bulletin.name}
                                  </div>
                                </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.avg}/20
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.rank}
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap">
                              {parseFloat(bulletin.avg) >= 10 ? (
                                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  {t.reportManagement.passed}
                                </Badge>
                              ) : (
                                <Badge variant="destructive">{t.reportManagement.failed}</Badge>
                              )}
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
                                  onClick={() => handlePrintFromRowClick(bulletin)}
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 hover:bg-green-50 rounded-md"
                                >
                                  <Printer className="h-4 w-4 mr-1" /> {t.common.print}
                                </Button>
                              </div>
                            </TableCell>
                              </TableRow>
                            );
                          })()
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
                      (() => {
                        const rankDetails = getRankDetails(bulletin.rank);
                        return (
                          <Card key={bulletin.id} className={`bg-white dark:bg-gray-800 shadow-md rounded-lg ${rankDetails?.cardClass || ''}`}>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                            {rankDetails?.icon}
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
                              {t.reportManagement.decision}:
                            </span>
                            {parseFloat(bulletin.avg) >= 10 ? (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {t.reportManagement.passed}
                              </Badge>
                            ) : (
                              <Badge variant="destructive">{t.reportManagement.failed}</Badge>
                            )}
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
                            onClick={() => handlePrintFromRowClick(bulletin)}
                            className="text-green-600 hover:bg-green-50 rounded-md"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                        );
                      })()
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
      {/* Dialogue de prévisualisation */}
      <Dialog open={previewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col">
          <PrintableReport
            report={selectedReport}
            establishmentInfo={{ schoolName, address, phone, website }}
            selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
            selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
            selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
            dynamicEvaluationHeaders={dynamicEvaluationHeaders}
            getMention={getMention}
            t={t}
            isRTL={isRTL}            
            onClose={() => setPreviewOpen(false)}
            onPrint={handlePrintFromPreviewClick}
            onExport={exportPreviewedReport}
          

          />
        </DialogContent>
      </Dialog>

      {/* Dialogue de choix d'orientation */}
      <Dialog open={isOrientationDialogOpen} onOpenChange={setIsOrientationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reports.orientationDialog.title}</DialogTitle>
            <DialogDescription>
              {t.reports.orientationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => { printAllReports('portrait'); setIsOrientationDialogOpen(false); }}
              className="w-full sm:w-auto"
            >
              {t.reports.orientationDialog.portrait}
            </Button>
            <Button
              onClick={() => { printAllReports('landscape'); setIsOrientationDialogOpen(false); }}
              className="w-full sm:w-auto"
            >
              {t.reports.orientationDialog.landscape}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Dialogue de choix d'orientation pour impression unique */}
      <Dialog open={isSinglePrintDialogOpen} onOpenChange={setIsSinglePrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.reports.orientationDialog.title}</DialogTitle>
            <DialogDescription>
              {t.reports.orientationDialog.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => { printPreviewedReport('portrait'); setIsSinglePrintDialogOpen(false); }}
              className="w-full sm:w-auto"
            >
              {t.reports.orientationDialog.portrait}
            </Button>
            <Button
              onClick={() => { printPreviewedReport('landscape'); setIsSinglePrintDialogOpen(false); }}
              className="w-full sm:w-auto"
            >
              {t.reports.orientationDialog.landscape}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}