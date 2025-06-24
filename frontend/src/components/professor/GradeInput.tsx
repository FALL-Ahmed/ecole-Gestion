import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
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
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Save, Loader2, BookOpen, CalendarDays, Users, Bookmark, School, ClipboardList, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext'; // Assuming AuthContext is correctly implemented

// --- Définition des Types (inchangés, mais ré-inclus pour la complétude) ---

// Types de base pour les entités utilisées
type AnneeScolaire = { id: number; libelle: string; dateDebut?: string; dateFin?: string; };
type Classe = { id: number; nom: string; niveau?: string; annee_scolaire_id?: number };
type Matiere = { id: number; nom: string; code?: string; };
type Trimestre = { id: number; nom: string; date_debut: string; date_fin: string; };

// Type Utilisateur révisé pour inclure tous les champs pertinents
type Utilisateur = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'professeur' | 'eleve' | 'admin' | string;
  motDePasse?: string;
  genre?: string;
  adresse?: string;
  tuteurNom?: string;
  tuteurTelephone?: string;
  photoUrl?: string | null;
  actif?: boolean;
};

// Type de la réponse brute de l'API /api/affectations, incluant les objets imbriqués complets
type AffectationApiResponse = {
  id: number;
  professeur: Utilisateur;
  matiere: Matiere;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
};

// Type d'Affectation pour le state interne du composant, aplati pour faciliter les filtres
type ProcessedAffectation = {
  id: number; // ID de l'affectation elle-même
  professeurId: number;
  professeurNomComplet: string; // Pour l'affichage dans le select
  matiereId: number;
  matiereNom: string;
  classeId: number;
  classeNom: string;
  anneeScolaireId: number;
  anneeScolaireLibelle: string;
};

type Eleve = { id: number; nom: string; prenom: string; };

// Type pour les types d'évaluation (avec id pour le select et nom pour l'envoi au backend)
type EvaluationType = { id: number; nom: string; };

// Type de la réponse API pour /api/inscriptions
type InscriptionApiResponse = {
  id: number;
  date_inscription: string;
  actif: boolean;
  utilisateur: Utilisateur;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
};

// Type pour la configuration de l'année académique active
type Configuration = {
  id: number;
  annee_scolaire?: AnneeScolaire; // L'objet année scolaire complet si joint
  annee_academique_active_id?: number; // L'ID direct si non joint
};

// Type pour une entrée de note dans l'état
type NoteEntry = { eleveId: number; nom: string; prenom: string; note: string };

// --- Composant GradeInput ---
export function GradeInput() {
  const { user } = useAuth();

  // --- États des données initiales chargées depuis l'API ---
  const [activeAnneeScolaire, setActiveAnneeScolaire] = useState<AnneeScolaire | null>(null);
  const [currentTrimestre, setCurrentTrimestre] = useState<Trimestre | null>(null);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allUsers, setAllUsers] = useState<Utilisateur[]>([]);
  const [processedAffectations, setProcessedAffectations] = useState<ProcessedAffectation[]>([]);

  // --- États des sélections du formulaire ---
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedEvalTypeId, setSelectedEvalTypeId] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');

  // --- État de la matière déterminée automatiquement ---
  const [currentMatiere, setCurrentMatiere] = useState<Matiere | null>(null);

  // --- États des élèves et des notes ---
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);

  // --- États de chargement ---
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [loadingEleves, setLoadingEleves] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // --- CHARGEMENT INITIAL DES DONNÉES (Configuration, Affectations, Classes, Utilisateurs) ---
  useEffect(() => {
    const fetchAllBaseData = async () => {
      setLoadingInitialData(true);
      try {
        console.log('🔄 Chargement des données initiales...');

        // Step 1: Fetch active academic year configuration first
        const configRes = await fetch('http://localhost:3000/api/configuration');
        if (!configRes.ok) {
          const errorText = await configRes.text();
          throw new Error(`Erreur lors du chargement de la configuration: ${configRes.status} - ${errorText}`);
        }
        const configData: Configuration | Configuration[] = await configRes.json();
        
        let fetchedAnneeScolaire: AnneeScolaire | null = null;
        if (Array.isArray(configData) && configData.length > 0) {
            // Assume the first element contains the active year config
            if (configData[0].annee_scolaire) {
                fetchedAnneeScolaire = configData[0].annee_scolaire;
            } else if (configData[0].annee_academique_active_id) {
                // Fallback: if only ID is present, create a minimal object (though full object is better)
                fetchedAnneeScolaire = { id: configData[0].annee_academique_active_id, libelle: 'Année active' };
            }
        } else if (configData && !Array.isArray(configData)) {
            // If it's a single object (e.g., /api/configuration/1)
            if (configData.annee_scolaire) {
                fetchedAnneeScolaire = configData.annee_scolaire;
            } else if (configData.annee_academique_active_id) {
                fetchedAnneeScolaire = { id: configData.annee_academique_active_id, libelle: 'Année active' };
            }
        }

        if (fetchedAnneeScolaire && fetchedAnneeScolaire.id) {
          setActiveAnneeScolaire(fetchedAnneeScolaire);
          console.log('✅ Année académique active chargée:', fetchedAnneeScolaire);
        } else {
          toast({
            title: 'Configuration manquante',
            description: 'L\'ID de l\'année académique active n\'a pas pu être trouvé. Veuillez vérifier la configuration API.',
            variant: 'destructive',
          });
          setLoadingInitialData(false);
          return;
        }

        // Step 2: Fetch other data using Promise.all
        const [affectationsRes, allClassesRes, utilisateursRes] = await Promise.all([
          fetch('http://localhost:3000/api/affectations?include=professeur,matiere,classe,annee_scolaire'),
          fetch('http://localhost:3000/api/classes'),
          fetch('http://localhost:3000/api/users'),
        ]);

        const checkResponse = async (res: Response, name: string) => {
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`🔥 Échec du chargement des ${name}: ${res.status} - ${errorText}`);
            throw new Error(`Erreur lors du chargement des ${name}.`);
          }
        };

        await Promise.all([
          checkResponse(affectationsRes, 'affectations'),
          checkResponse(allClassesRes, 'classes'),
          checkResponse(utilisateursRes, 'utilisateurs'),
        ]);

        const [rawAffectations, rawAllClasses, rawUtilisateurs]:
          [AffectationApiResponse[], Classe[], Utilisateur[]] = await Promise.all([
            affectationsRes.json(),
            allClassesRes.json(),
            utilisateursRes.json(),
          ]);

        console.log('📦 Données brutes (Affectations):', rawAffectations);
        console.log('📦 Données brutes (Classes):', rawAllClasses);
        console.log('📦 Données brutes (Utilisateurs):', rawUtilisateurs);

        const processed = rawAffectations.map(aff => {
          if (!aff.professeur || !aff.matiere || !aff.classe || !aff.annee_scolaire) {
            console.warn('⚠️ Affectation invalide (données manquantes), ignorée:', aff);
            return null;
          }
          return {
            id: aff.id,
            professeurId: aff.professeur.id,
            professeurNomComplet: `${aff.professeur.nom} ${aff.professeur.prenom}`,
            matiereId: aff.matiere.id,
            matiereNom: aff.matiere.nom,
            classeId: aff.classe.id,
            classeNom: aff.classe.nom,
            anneeScolaireId: aff.annee_scolaire.id,
            anneeScolaireLibelle: aff.annee_scolaire.libelle,
          };
        }).filter(Boolean) as ProcessedAffectation[];

        setProcessedAffectations(processed);
        setAllClasses(rawAllClasses);
        setAllUsers(rawUtilisateurs);
        const uniqueMatieres = Array.from(new Map(rawAffectations.map(aff => [aff.matiere.id, aff.matiere])).values());
        setAllMatieres(uniqueMatieres);

      } catch (error) {
        console.error('🔥 Erreur globale lors du chargement des données initiales:', error);
        toast({
          title: 'Erreur de chargement',
          description: error instanceof Error ? error.message : 'Impossible de charger les données initiales du formulaire. Veuillez réessayer.',
          variant: 'destructive',
        });
      } finally {
        setLoadingInitialData(false);
      }
    };

    fetchAllBaseData();
  }, [toast]); // Dependencies: toast

  // --- FILTRES CASCADANTS ET MISE À JOUR DU FORMULAIRE ---

  // 1. Filtrer les classes disponibles en fonction de l'année scolaire active et du professeur connecté
  const classesForProfessorAndActiveAnnee = useMemo(() => {
    console.log("--- Debug: useMemo [classesForProfessorAndActiveAnnee] re-evaluating ---");
    console.log("activeAnneeScolaire for memo:", activeAnneeScolaire);
    console.log("user for memo:", user);
    console.log("processedAffectations length for memo:", processedAffectations.length);

    if (activeAnneeScolaire === null || user === null || user.role !== 'professeur' || processedAffectations.length === 0) {
      console.log("⚠️ useMemo [classesForProfessorAndActiveAnnee]: Année active, utilisateur, rôle, ou affectations incomplets, retour d'une liste vide");
      return [];
    }

    const selectedProfesseurId = user.id;

    const filteredAffectations = processedAffectations.filter(
      (aff) => aff.anneeScolaireId === activeAnneeScolaire.id && aff.professeurId === selectedProfesseurId
    );
    console.log("Filtered Affectations by year and professor:", filteredAffectations);

    const classIdsSet = new Set(filteredAffectations.map((aff) => aff.classeId));
    console.log("Unique Class IDs from filtered Affectations:", Array.from(classIdsSet));

    const filteredClasses = allClasses.filter((cls) => classIdsSet.has(cls.id));

    console.log("✅ useMemo [classesForProfessorAndActiveAnnee]: Classes filtrées pour l'année active et le professeur connecté:", filteredClasses);
    return filteredClasses;
  }, [activeAnneeScolaire, processedAffectations, allClasses, user]);

  // 2. Déterminer automatiquement la matière en fonction de l'année active, de la classe et du professeur connecté
  useEffect(() => {
    console.log('--- Debug: Détermination de la matière courante ---');
    console.log('activeAnneeScolaire:', activeAnneeScolaire);
    console.log('selectedClassId:', selectedClassId);
    console.log('Logged-in user ID:', user?.id);

    const selectedProfesseurId = user?.id || null;

    if (!user || user.role !== 'professeur') {
      console.warn('⚠️ Utilisateur non connecté ou n\'est pas un professeur. Impossible de déterminer la matière.');
      setCurrentMatiere(null);
      return;
    }

    if (activeAnneeScolaire === null || selectedClassId === null || selectedProfesseurId === null) {
      console.log('ℹ️ Critères Année active, Classe ou Professeur incomplets. Réinitialisation de la matière.');
      setCurrentMatiere(null);
      return;
    }

    const foundAffectation = processedAffectations.find(
      aff =>
        aff.anneeScolaireId === activeAnneeScolaire.id &&
        aff.classeId === selectedClassId &&
        aff.professeurId === selectedProfesseurId
    );

    console.log('Affectation trouvée pour les sélections actuelles:', foundAffectation);

    if (foundAffectation) {
      const matiereDetails = allMatieres.find(m => m.id === foundAffectation.matiereId);
      if (matiereDetails) {
        console.log('✅ Matière courante définie:', matiereDetails);
        setCurrentMatiere(matiereDetails);
      } else {
        console.warn('⚠️ Détails de la matière introuvables pour l\'ID:', foundAffectation.matiereId);
        setCurrentMatiere(null);
      }
    } else {
      console.log('ℹ️ Aucune affectation trouvée pour cette combinaison.');
      setCurrentMatiere(null);
      if (processedAffectations.length > 0) {
        toast({
          title: 'Aucune affectation trouvée',
          description: 'La combinaison Année, Classe et Professeur sélectionnée n\'est pas affectée à une matière.',
          variant: 'default',
        });
      }
    }
  }, [activeAnneeScolaire, selectedClassId, user, processedAffectations, allMatieres, toast]);

  // --- Réinitialisation des sélections dépendantes lors du changement de l'année active (si elle change un jour)
  useEffect(() => {
    console.log('--- Debug: activeAnneeScolaire changed. Resetting Class. ---');
    setSelectedClassId(null);
  }, [activeAnneeScolaire]);

  // --- CHARGEMENT DU TRIMESTRE BASÉ SUR LA DATE ET L'ANNÉE SCOLAIRE ACTIVE ---
  useEffect(() => {
    const fetchTrimestre = async () => {
      if (!date || !activeAnneeScolaire) {
        setCurrentTrimestre(null);
        return;
      }

      try {
        console.log(`🔍 Recherche du trimestre pour la date ${date} et année active ${activeAnneeScolaire.id}`);
        const trimestreRes = await fetch(`http://localhost:3000/api/trimestres/by-date?date=${date}&anneeId=${activeAnneeScolaire.id}`);
        if (!trimestreRes.ok) {
          const errorText = await trimestreRes.text();
          throw new Error(`Impossible de déterminer le trimestre: ${trimestreRes.status} - ${errorText}`);
        }
        const trimestreData = await trimestreRes.json();
        setCurrentTrimestre(trimestreData);
        console.log('✅ Trimestre trouvé:', trimestreData);

      } catch (error) {
        console.error('🔥 Erreur lors de la détermination du trimestre:', error);
        toast({
          title: 'Erreur Trimestre',
          description: error instanceof Error ? error.message : 'Impossible de déterminer le trimestre pour la date sélectionnée.',
          variant: 'destructive',
        });
        setCurrentTrimestre(null);
      }
    };

    fetchTrimestre();
  }, [date, activeAnneeScolaire, toast]); // Dépend de la date et de l'année scolaire active


  // --- TYPES D'ÉVALUATION DYNAMIQUES BASÉS SUR LE TRIMESTRE ---
  const evaluationTypes: EvaluationType[] = useMemo(() => {
    if (!currentTrimestre) {
      console.log('ℹ️ Aucune date ou trimestre non trouvé, types d\'évaluation vides.');
      return []; // Aucune date sélectionnée ou trimestre non trouvé
    }

    console.log(`📊 Détermination des types d'évaluation pour le trimestre: ${currentTrimestre.nom}`);
    // Ajustez les IDs et les noms selon votre modèle de base de données et votre logique
    if (currentTrimestre.nom === 'Trimestre 1') {
      return [
        { id: 1, nom: 'Devoir 1' },
        { id: 2, nom: 'Devoir 2' },
        { id: 3, nom: 'Composition 1' },
      ];
    } else if (currentTrimestre.nom === 'Trimestre 2') {
      return [
        { id: 4, nom: 'Devoir 3' },
        { id: 5, nom: 'Devoir 4' },
        { id: 6, nom: 'Composition 2' },
      ];
    } else if (currentTrimestre.nom === 'Trimestre 3') {
      return [
        { id: 7, nom: 'Devoir 5' },
        { id: 8, nom: 'Devoir 6' },
        { id: 9, nom: 'Composition 3' },
      ];
    } else {
      console.warn('⚠️ Trimestre non reconnu ou logique non couverte, retour types génériques.');
      return [
        { id: 99, nom: 'Autre Type' }, // Un type générique pour les cas non gérés
      ];
    }
  }, [currentTrimestre]); // Dépend maintenant de currentTrimestre

  // --- Réinitialiser le type d'évaluation sélectionné si la liste des types change ---
  useEffect(() => {
    // Si la liste des types d'évaluation devient vide ou si le type sélectionné n'est plus dans la nouvelle liste
    if (selectedEvalTypeId !== null && !evaluationTypes.some(type => type.id === selectedEvalTypeId)) {
      setSelectedEvalTypeId(null);
      console.log('ℹ️ Type d\'évaluation réinitialisé car la liste a changé.');
    }
  }, [evaluationTypes, selectedEvalTypeId]);


  // --- CHARGEMENT DES ÉLÈVES (basé sur la classe et l'année académique active) ET INITIALISATION DES NOTES ---
  useEffect(() => {
    const fetchElevesAndInitNotes = async () => {
      console.log('--- Debug: useEffect [selectedClassId, activeAnneeScolaire] triggered ---');
      console.log('Current selectedClassId:', selectedClassId);
      console.log('Current activeAnneeScolaire:', activeAnneeScolaire);
      console.log('Current loadingInitialData:', loadingInitialData);

      // Vérifier les dépendances avant de procéder
      if (selectedClassId === null || activeAnneeScolaire === null || activeAnneeScolaire.id === undefined || loadingInitialData) {
        console.warn('⛔ Critères Classe ou Année active incomplets, ou chargement initial en cours. Resetting eleves/notes.');
        setLoadingEleves(false);
        setEleves([]);
        setNotes([]);
        return;
      }

      console.log(`🔄 Chargement des élèves pour Classe ID: ${selectedClassId}, Année Scolaire ID: ${activeAnneeScolaire.id}`);
      setLoadingEleves(true);
      setEleves([]); // Réinitialiser avant le fetch pour éviter l'affichage de données anciennes
      setNotes([]); // Réinitialiser avant le fetch

      try {
        // CORRECTION MAJEURE ICI : Changer anneeAcademiqueId en anneeScolaireId
        const res = await fetch(
          `http://localhost:3000/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${activeAnneeScolaire.id}`
        );

        if (!res.ok) {
          const errorText = await res.text();
          console.error('🔥 Erreur HTTP lors du chargement des inscriptions:', res.status, res.statusText, errorText);
          throw new Error('Erreur lors du chargement des inscriptions.');
        }

        const data: InscriptionApiResponse[] = await res.json();

        console.log('📦 Réponse API (inscriptions):', data);
        console.table(data); // Afficher les données dans un tableau pour une meilleure lisibilité


        if (!Array.isArray(data)) {
          console.error('⚠️ Réponse API inattendue (pas un tableau).', data);
          setEleves([]);
          setNotes([]);
          return;
        }

        const fetchedEleves: Eleve[] = data
          .map((inscription: InscriptionApiResponse) => {
            const user = inscription.utilisateur;

            if (!user) {
              console.warn("⚠️ Aucune utilisateur lié à cette inscription:", inscription);
              return null;
            }

            // Normalement, le backend filtre déjà par rôle 'eleve' avec la dernière correction.
            // Ce filtre côté frontend est une redondance de sécurité ou pour les tests.
            if (user.role !== 'eleve') {
              console.info("ℹ️ Utilisateur ignoré (role !== 'eleve'):", user);
              return null;
            }

            return {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
            };
          })
          .filter(Boolean) as Eleve[]; // Supprime les éléments `null`

        console.log('✅ Élèves filtrés:', fetchedEleves);
        console.log(`📊 Nombre d'élèves filtrés: ${fetchedEleves.length}`);
        setEleves(fetchedEleves);

        // Initialise les notes pour les élèves chargés
        const initialNotes = fetchedEleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, note: '' }));
        console.log('📝 Notes initialisées:', initialNotes);
        setNotes(initialNotes);

      } catch (error) {
        console.error('🔥 Erreur lors du chargement des élèves:', error);
        toast({
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Impossible de charger les élèves pour la sélection actuelle.',
          variant: 'destructive'
        });
        setEleves([]);
        setNotes([]);
      } finally {
        setLoadingEleves(false);
        console.log('--- Debug: useEffect [selectedClassId, activeAnneeScolaire] finished ---');
      }
    };

    fetchElevesAndInitNotes();
    // Dépendances du useEffect : assurez-vous qu'elles déclenchent l'effet quand ces valeurs changent
  }, [selectedClassId, activeAnneeScolaire, loadingInitialData, toast]);

  // --- Gestion du changement de note ---
  const handleNoteChange = useCallback((eleveId: number, note: string) => {
    if (note === '') {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: '' } : n)));
      return;
    }

    const numericNote = parseFloat(note);
    if (isNaN(numericNote) || numericNote < 0 || numericNote > 20) {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: note } : n)));
    } else {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: numericNote.toString() } : n)));
    }
  }, []);

  // --- Fonction d'enregistrement des notes ---
  const saveNotes = useCallback(async () => {
    console.log('--- Debug: saveNotes triggered ---');
    console.log('Current notes state:', notes);

    const professeurId = user?.id || null;

    if (!professeurId) {
      console.warn('⚠️ Utilisateur non connecté. Impossible d\'enregistrer.');
      toast({ title: 'Erreur', description: 'Vous devez être connecté pour enregistrer les notes.', variant: 'destructive' });
      return;
    }
    if (
      activeAnneeScolaire === null ||
      selectedClassId === null ||
      selectedEvalTypeId === null ||
      !date ||
      currentMatiere === null ||
      currentTrimestre === null ||
      notes.length === 0 ||
      notes.some(n => n.note === '')
    ) {
      console.warn('⚠️ Tentative d\'enregistrement avec champs manquants ou notes vides.');
      toast({
        title: 'Champ(s) manquant(s) ou incomplet(s)',
        description: 'Veuillez remplir toutes les informations d\'évaluation et toutes les notes avant d\'enregistrer.',
        variant: 'destructive'
      });
      return;
    }

    const invalidNotes = notes.filter(n => {
      const numericNote = parseFloat(n.note);
      return isNaN(numericNote) || numericNote < 0 || numericNote > 20;
    });

    if (invalidNotes.length > 0) {
      console.warn('⚠️ Tentative d\'enregistrement avec notes invalides:', invalidNotes);
      toast({
        title: 'Note(s) invalide(s)',
        description: 'Veuillez vous assurer que toutes les notes sont des nombres valides entre 0 et 20.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      console.log('🚀 Début de l\'enregistrement...');

      const trimestreId = currentTrimestre?.id;

      if (!trimestreId) {
        throw new Error("Trimestre introuvable pour cette date et année scolaire. Veuillez vérifier les trimestres configurés.");
      }
      console.log('✅ Trimestre ID pour l\'évaluation:', trimestreId);

      const evaluationTypeSelected = evaluationTypes.find(t => t.id === selectedEvalTypeId);
      if (!evaluationTypeSelected) {
        toast({
          title: 'Erreur de sélection',
          description: 'Type d\'évaluation non trouvé. Veuillez sélectionner un type valide.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // 2. Créer l'évaluation
      const evaluationPayload = {
        matiere: { id: currentMatiere.id },
        classe: { id: selectedClassId },
        professeur: { id: professeurId },
        type: evaluationTypeSelected.nom,
        dateEval: date,
        trimestre: { id: trimestreId },
        anneeScolaire: { id: activeAnneeScolaire.id }
      };
      console.log('📥 Création de l\'évaluation avec les données:', evaluationPayload);
      const evalRes = await fetch('http://localhost:3000/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(evaluationPayload)
      });

      if (!evalRes.ok) {
        const errorText = await evalRes.text();
        throw new Error(`Erreur lors de la création de l'évaluation: ${evalRes.status} - ${errorText}`);
      }
      const evalData = await evalRes.json();
      const evaluationId = evalData?.id;

      if (!evaluationId) throw new Error("L'ID de l'évaluation n'a pas été retourné par l'API.");
      console.log('✅ Évaluation créée avec ID:', evaluationId);

      // 3. Enregistrer les notes
      const notesToSave = notes.map(n => ({
        evaluation_id: evaluationId,
        etudiant_id: n.eleveId,
        note: parseFloat(n.note),
      }));
      console.log('📝 Enregistrement des notes:', notesToSave);

      const noteRes = await fetch('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notesToSave)
      });

      if (!noteRes.ok) {
        const errorText = await noteRes.text();
        throw new Error(`Erreur lors de l'enregistrement des notes: ${noteRes.status} - ${errorText}`);
      }
      console.log('✅ Notes enregistrées avec succès.');

      toast({
        title: 'Succès',
        description: 'Évaluation et notes enregistrées avec succès !',
        variant: 'default'
      });

      // Reset form after successful save
      setSelectedEvalTypeId(null);
      setDate('');
      setNotes(prev => prev.map(n => ({ ...n, note: '' })));

    } catch (error: any) {
      console.error("🔥 Erreur lors de l'enregistrement :", error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur inconnue est survenue lors de l\'enregistrement.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
      console.log('--- Debug: saveNotes finished ---');
    }
  }, [activeAnneeScolaire, selectedClassId, user, selectedEvalTypeId, date, currentMatiere, currentTrimestre, notes, toast, evaluationTypes]);

  // Determines if the "Saisie des Notes" section should be visible
  const isFormComplete = useMemo(() => {
    console.log('--- Debug: Checking isFormComplete ---');
    console.log('activeAnneeScolaire:', activeAnneeScolaire);
    console.log('selectedClassId:', selectedClassId);
    console.log('selectedEvalTypeId:', selectedEvalTypeId);
    console.log('date:', date);
    console.log('currentMatiere:', currentMatiere);
    console.log('currentTrimestre:', currentTrimestre);
    console.log('user:', user);

    const complete = (
      activeAnneeScolaire !== null &&
      selectedClassId !== null &&
      selectedEvalTypeId !== null &&
      date !== '' &&
      currentMatiere !== null &&
      currentTrimestre !== null &&
      user?.role === 'professeur'
    );
    console.log('isFormComplete:', complete);
    return complete;
  }, [activeAnneeScolaire, selectedClassId, selectedEvalTypeId, date, currentMatiere, currentTrimestre, user]);

  if (loadingInitialData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700">Chargement des données initiales...</span>
      </div>
    );
  }

  // Render a message if the user is not a professor
  if (!user || user.role !== 'professeur') {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-4 flex flex-col items-center justify-center">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700">Accès refusé</span>
        <p className="text-lg text-gray-600 mt-2">Seuls les professeurs sont autorisés à saisir des notes.</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-4">
      <div className="space-y-10">
        <h1 className="text-2xl font-bold mb-6">Portail de Saisie des Notes</h1>

        <Card className="w-full border border-blue-100 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-blue-600 text-white p-6">
            <div className="flex items-center space-x-3">
              <ClipboardList className="h-6 w-6" />
              <CardTitle className="text-xl font-semibold">Critères de l'Évaluation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Année scolaire - AFFICHAGE AUTOMATIQUE, NON SÉLECTIONNABLE */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                Année scolaire actuelle
              </label>
              <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-blue-50 border-blue-200 text-blue-800">
                <span className="font-medium">
                  {activeAnneeScolaire?.libelle || 'Chargement...'}
                </span>
              </div>
            </div>

            {/* Classe */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <School className="h-4 w-4 mr-2 text-blue-600" />
                Classe
              </label>
              <Select
                onValueChange={val => setSelectedClassId(val ? Number(val) : null)}
                value={selectedClassId !== null ? String(selectedClassId) : ''}
                disabled={classesForProfessorAndActiveAnnee.length === 0 || !activeAnneeScolaire}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classesForProfessorAndActiveAnnee.length > 0 ? (
                    classesForProfessorAndActiveAnnee.map(classe => (
                      <SelectItem key={classe.id} value={String(classe.id)}>
                        {classe.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      {activeAnneeScolaire === null ? "Chargement de l'année..." : "Aucune classe affectée à vous pour cette année"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Professeur - Affichage automatique */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-600" />
                Professeur
              </label>
              <div className={`flex items-center h-10 px-3 py-2 rounded-md border ${user?.role === 'professeur' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {user?.role === 'professeur' ? (
                  <>
                    <User className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">{user.nom} {user.prenom}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Non applicable (pas professeur)</span>
                )}
              </div>
            </div>

            {/* Matière - Affichage automatique */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                Matière
              </label>
              <div className={`flex items-center h-10 px-3 py-2 rounded-md border ${currentMatiere ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <span className="font-medium">
                  {currentMatiere ? currentMatiere.nom : 'Automatique après sélection'}
                </span>
              </div>
            </div>

            {/* Date de l'évaluation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                Date de l'évaluation
              </label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border-blue-200 focus:ring-blue-500"
              />
            </div>

            {/* Trimestre - AFFICHAGE AUTOMATIQUE, NON SÉLECTIONNABLE */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                Trimestre
              </label>
              <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-blue-50 border-blue-200 text-blue-800">
                <span className="font-medium">
                  {currentTrimestre?.nom || 'Sélectionnez une date...'}
                </span>
              </div>
            </div>

            {/* Type d'évaluation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Bookmark className="h-4 w-4 mr-2 text-blue-600" />
                Type d'évaluation
              </label>
              <Select
                onValueChange={val => setSelectedEvalTypeId(val ? Number(val) : null)}
                value={selectedEvalTypeId !== null ? String(selectedEvalTypeId) : ''}
                disabled={evaluationTypes.length === 0}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {evaluationTypes.length > 0 ? (
                    evaluationTypes.map(type => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      Sélectionnez une date d'abord
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

          </CardContent>
        </Card>

        {/* Section de Saisie des Notes */}
        {isFormComplete ? (
          <Card className="w-full border border-blue-200 shadow-lg rounded-xl overflow-hidden">

            <CardHeader className="bg-blue-50 border-b border-blue-200 p-6">

              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6" />
                <CardTitle className="text-xl font-semibold">Saisie des Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingEleves ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500 mr-3" />
                  <span className="text-lg text-gray-600">Chargement des élèves...</span>
                </div>
              ) : eleves.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <AlertCircle className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
                  <p className="text-lg">Aucun élève trouvé pour cette classe et cette année scolaire.</p>
                  <p className="text-sm">Veuillez vérifier les inscriptions ou les critères de sélection.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Nom Complet</TableHead>
                        <TableHead className="text-right">Note (/20)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notes.map(noteEntry => (
                        <TableRow key={noteEntry.eleveId}>
                          <TableCell>{noteEntry.nom} {noteEntry.prenom}</TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="20"
                              value={noteEntry.note}
                              onChange={(e) => handleNoteChange(noteEntry.eleveId, e.target.value)}
                              className="w-24 text-right ml-auto border-gray-300 focus:border-green-500 focus:ring-green-500"
                              aria-label={`Note pour ${noteEntry.nom} ${noteEntry.prenom}`}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={saveNotes}
                  disabled={isSaving || eleves.length === 0 || notes.some(n => n.note === '')}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 flex items-center"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Save className="mr-2 h-4 w-4" />
                  Enregistrer les notes
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full border border-gray-200 shadow-lg rounded-xl overflow-hidden bg-gray-50">
            <CardHeader className="bg-gray-100 text-gray-700 p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6" />
                <CardTitle className="text-xl font-semibold">Saisie des Notes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 text-center text-gray-500">
              <AlertCircle className="h-10 w-10 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">Veuillez compléter tous les critères d'évaluation ci-dessus pour afficher la liste des élèves.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}