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

// --- Définition des Types ---

// Types de base pour les entités utilisées dans les Selects
type AnneeScolaire = { id: number; libelle: string; dateDebut?: string; dateFin?: string; };
type Classe = { id: number; nom: string; niveau?: string; annee_scolaire_id?: number };
type Matiere = { id: number; nom: string; code?: string; };

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

type EvaluationType = { id: number; nom: string; };

// --- NOUVEAU TYPE DE LA RÉPONSE API POUR /api/inscriptions ---
// Ce type attend les objets complets 'utilisateur', 'classe', 'annee_scolaire' imbriqués
// car votre backend les retourne grâce à `relations` dans InscriptionService.
type InscriptionApiResponse = {
  id: number;
  date_inscription: string;
  actif: boolean;
  utilisateur: Utilisateur;       // L'objet Utilisateur complet est ici
  classe: Classe;                 // L'objet Classe complet est ici
  annee_scolaire: AnneeScolaire; // L'objet AnneeScolaire complet est ici
};

// Type pour une entrée de note dans l'état
type NoteEntry = { eleveId: number; nom: string; prenom: string; note: string };

export function GradeInput() {
  const { user } = useAuth(); // If user role affects what they can see/do, you might use this.

  // --- États des données initiales chargées depuis l'API ---
  const [anneesScolaires, setAnneesScolaires] = useState<AnneeScolaire[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  // allUsers contiendra TOUS les utilisateurs (élèves, profs, admins)
  const [allUsers, setAllUsers] = useState<Utilisateur[]>([]); // Still needed for initial data loading/processing
  const [processedAffectations, setProcessedAffectations] = useState<ProcessedAffectation[]>([]);

  // --- États des sélections du formulaire ---
  const [selectedAnneeId, setSelectedAnneeId] = useState<number | null>(null);
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

  // --- Types d'évaluation fixes (peuvent être chargés depuis une API si dynamiques) ---
  const evaluationTypes: EvaluationType[] = useMemo(() => [
    { id: 1, nom: 'Devoir 1' },
    { id: 2, nom: 'Devoir 2' },
    { id: 3, nom: 'Composition' },
  ], []);

  // --- CHARGEMENT INITIAL DES DONNÉES (Affectations, Classes, Années, Utilisateurs) ---
  useEffect(() => {
    const fetchAllBaseData = async () => {
      setLoadingInitialData(true);
      try {
        console.log('🔄 Chargement des données initiales...');

        const [affectationsRes, allClassesRes, anneesRes, utilisateursRes] = await Promise.all([
          fetch('http://localhost:3000/api/affectations?include=professeur,matiere,classe,annee_scolaire'),
          fetch('http://localhost:3000/api/classes'),
          fetch('http://localhost:3000/api/annees-academiques'),
          fetch('http://localhost:3000/api/users'), // <--- Appel pour TOUS les utilisateurs (élèves et profs)
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
          checkResponse(anneesRes, 'années académiques'),
          checkResponse(utilisateursRes, 'utilisateurs'),
        ]);

        const [rawAffectations, rawAllClasses, rawAnnees, rawUtilisateurs]:
          [AffectationApiResponse[], Classe[], AnneeScolaire[], Utilisateur[]] = await Promise.all([
            affectationsRes.json(),
            allClassesRes.json(),
            anneesRes.json(),
            utilisateursRes.json(),
          ]);

        console.log('📦 Données brutes (Affectations):', rawAffectations);
        console.log('📦 Données brutes (Classes):', rawAllClasses);
        console.log('📦 Données brutes (Années Académiques):', rawAnnees);
        console.log('📦 Données brutes (Utilisateurs):', rawUtilisateurs);

        const processed = rawAffectations.map(aff => {
          // Ensure all necessary nested objects exist before processing
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
        }).filter(Boolean) as ProcessedAffectation[]; // Filter out any null entries

        setProcessedAffectations(processed);
        setAllClasses(rawAllClasses);
        setAnneesScolaires(rawAnnees);
        setAllUsers(rawUtilisateurs); // <--- Stocke TOUS les utilisateurs
        // Extract unique matières from affectations
        const uniqueMatieres = Array.from(new Map(rawAffectations.map(aff => [aff.matiere.id, aff.matiere])).values());
        setAllMatieres(uniqueMatieres);

        console.log('✅ Affectations traitées pour le state:', processed);
        console.log('✅ Toutes les classes:', rawAllClasses);
        console.log('✅ Toutes les années scolaires:', rawAnnees);
        console.log('✅ Tous les utilisateurs (élèves et profs):', rawUtilisateurs);
        console.log('✅ Toutes les matières:', uniqueMatieres);

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
  }, [toast]); // Dependencies: toast (from use-toast hook)

  // --- FILTRES CASCADANTS ET MISE À JOUR DU FORMULAIRE ---

  // 1. Filtrer les classes disponibles en fonction de l'année scolaire sélectionnée
  const classesForSelectedAnnee = useMemo(() => {
  console.log("🔍 useMemo [classesForSelectedAnnee]: selectedAnneeId:", selectedAnneeId);
  console.log("📦 useMemo [classesForSelectedAnnee]: processedAffectations:", processedAffectations);
  console.log("📚 useMemo [classesForSelectedAnnee]: allClasses:", allClasses);

  if (selectedAnneeId === null) {
    console.log("⚠️ useMemo [classesForSelectedAnnee]: Aucune année sélectionnée, retour d'une liste vide");
    return [];
  }

  const selectedId = Number(selectedAnneeId);

  // Filter affectations by selected year AND the logged-in professor
  const filteredAffectations = processedAffectations.filter(
    (aff) => Number(aff.anneeScolaireId) === selectedId && aff.professeurId === user?.id
  );

  // Get unique class IDs from these filtered affectations
  const classIdsSet = new Set(filteredAffectations.map((aff) => aff.classeId));

  // Filter the full list of classes to only include those IDs
  const filteredClasses = allClasses.filter((cls) => classIdsSet.has(cls.id));

  console.log("✅ useMemo [classesForSelectedAnnee]: Classes filtrées pour l'année et le professeur connecté:", filteredClasses);
  return filteredClasses;
}, [selectedAnneeId, processedAffectations, allClasses, user]); // Depend on user

  // 2. Déterminer automatiquement la matière en fonction de l'année, de la classe et du professeur connecté
  useEffect(() => {
    console.log('--- Debug: Détermination de la matière courante ---');
    console.log('selectedAnneeId:', selectedAnneeId);
    console.log('selectedClassId:', selectedClassId);
    console.log('Logged-in user ID:', user?.id); // Log the logged-in user ID

    // Use the logged-in user's ID as the professor ID
    const selectedProfesseurId = user?.id || null;

    // Check if user is logged in and is a professor
    if (!user || user.role !== 'professeur') {
        console.warn('⚠️ Utilisateur non connecté ou n\'est pas un professeur. Impossible de déterminer la matière.');
        setCurrentMatiere(null);
        // setEleves([]); // Students/Notes reset is now handled by the [selectedClassId, selectedAnneeId] effect
        // setNotes([]);
        // Optionally show a toast or message if the user role is incorrect
        // toast({ title: 'Accès refusé', description: 'Seuls les professeurs peuvent saisir des notes.', variant: 'destructive' });
        return;
    }

    console.log('Using selectedProfesseurId (from user):', selectedProfesseurId);

    if (selectedAnneeId === null || selectedClassId === null || selectedProfesseurId === null) {
      console.log('ℹ️ Critères Année, Classe ou Professeur incomplets. Réinitialisation de la matière.');
      setCurrentMatiere(null);
      // setEleves([]); // Students/Notes reset is now handled by the [selectedClassId, selectedAnneeId] effect
      // setNotes([]);
      return;
    }

    const foundAffectation = processedAffectations.find(
      aff =>
        aff.anneeScolaireId === selectedAnneeId &&
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
      // Only show toast if affectations data has been loaded and no match is found
      if (processedAffectations.length > 0) {
        toast({
          title: 'Aucune affectation trouvée',
          description: 'La combinaison Année, Classe et Professeur sélectionnée n\'est pas affectée à une matière.',
          variant: 'default',
        });
      }
    }
    // setEleves([]); // Students/Notes reset is now handled by the [selectedClassId, selectedAnneeId] effect
    // setNotes([]);
  }, [selectedAnneeId, selectedClassId, user, processedAffectations, allMatieres, toast]); // Depend on user

  // --- Réinitialisation des sélections dépendantes ---
  useEffect(() => {
    console.log('--- Debug: selectedAnneeId changed. Resetting Class. ---');
    setSelectedClassId(null);
  }, [selectedAnneeId]);


  // --- CHARGEMENT DES ÉLÈVES (basé sur la classe et l'année sélectionnées) ET INITIALISATION DES NOTES ---
 useEffect(() => {
  const fetchElevesAndInitNotes = async () => {
    console.log('--- Debug: useEffect [selectedClassId, selectedAnneeId] triggered ---');
    console.log('Current selectedClassId:', selectedClassId);
    console.log('Current selectedAnneeId:', selectedAnneeId);
    console.log('Current loadingInitialData:', loadingInitialData);


    if (selectedClassId === null || selectedAnneeId === null || loadingInitialData) {
      console.warn('⛔ Critères Année ou Classe incomplets, ou chargement initial en cours. Resetting eleves/notes.');
      setLoadingEleves(false); // Ensure loading is off if criteria are incomplete
      setEleves([]); // Reset students when criteria change
      setNotes([]);   // Reset notes
      return;
    }

    console.log(`🔄 Chargement des élèves pour Classe ID: ${selectedClassId}, Année Scolaire ID: ${selectedAnneeId}`);
    setLoadingEleves(true); // Start loading indicator
    setEleves([]); // Clear previous students while loading
    setNotes([]); // Clear previous notes while loading
    try {
      const res = await fetch(
        `http://localhost:3000/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedAnneeId}`
      );

      if (!res.ok) {
          const errorText = await res.text();
          console.error('🔥 Erreur HTTP lors du chargement des inscriptions:', res.status, res.statusText, errorText);
          throw new Error('Erreur lors du chargement des inscriptions.');
        }

      const data: InscriptionApiResponse[] = await res.json();

      console.log('📦 Réponse API (inscriptions):', data);
      console.table(data);


      if (!Array.isArray(data)) {
        console.error('⚠️ Réponse API inattendue (pas un tableau).', data);
        setEleves([]);
        setNotes([]);
        return;
      }

      const fetchedEleves: Eleve[] = data
        .map((inscription: InscriptionApiResponse) => { // Use the correct type here
          const user = inscription.utilisateur;

          if (!user) {
            console.warn("⚠️ Aucune utilisateur lié à cette inscription:", inscription);
            return null;
          }

          // Ensure the user object has the 'role' property and it is 'eleve'
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
        .filter(Boolean) as Eleve[]; // Filter out null entries and cast

      console.log('✅ Élèves filtrés:', fetchedEleves);
      console.log(`📊 Nombre d'élèves filtrés: ${fetchedEleves.length}`);
      setEleves(fetchedEleves); // <--- Update eleves state

      // Initialise les notes ici, directement après avoir les élèves
      const initialNotes = fetchedEleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, note: '' }));
      console.log('📝 Notes initialisées:', initialNotes);
      setNotes(initialNotes); // <--- Initialize notes state

    } catch (error) {
      console.error('🔥 Erreur lors du chargement des élèves:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de charger les élèves pour la sélection actuelle.',
        variant: 'destructive'
      });
      setEleves([]); // Ensure state is empty on error
      setNotes([]); // Reset notes on error as well
    } finally {
      setLoadingEleves(false); // Stop loading indicator
      console.log('--- Debug: useEffect [selectedClassId, selectedAnneeId] finished ---');
    }
  };

  fetchElevesAndInitNotes();
}, [selectedClassId, selectedAnneeId, loadingInitialData, toast]); // Dependencies: selectedClassId, selectedAnneeId, loadingInitialData, toast


  // --- Gestion du changement de note ---
  const handleNoteChange = useCallback((eleveId: number, note: string) => {
    // Allow empty string for initial input, then validate numeric range
    if (note === '') {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: '' } : n)));
      return;
    }

    const numericNote = parseFloat(note);
    // Validate number and range
    if (isNaN(numericNote) || numericNote < 0 || numericNote > 20) {
      // If invalid, keep the user's input as is, but don't allow saving yet.
      // Or you could revert to previous valid note or an empty string.
      // For now, keeping the raw invalid input to let the user correct.
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: note } : n)));
    } else {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: numericNote.toString() } : n)));
    }
  }, []);


  // --- Fonction d'enregistrement des notes ---
  const saveNotes = useCallback(async () => {
    console.log('--- Debug: saveNotes triggered ---');
    console.log('Current notes state:', notes);

    // Check for general form completeness and any empty notes
    // Use the logged-in user's ID as the professor ID for the payload
    const professeurId = user?.id || null;

    if (!professeurId) {
        console.warn('⚠️ Utilisateur non connecté. Impossible d\'enregistrer.');
        toast({ title: 'Erreur', description: 'Vous devez être connecté pour enregistrer les notes.', variant: 'destructive' });
        return;
    }
    if (
      selectedAnneeId === null ||
      selectedClassId === null ||
      selectedEvalTypeId === null ||
      !date ||
      currentMatiere === null ||
      notes.length === 0 || // No students loaded means nothing to save
      notes.some(n => n.note === '') // At least one note is empty
    ) {
      console.warn('⚠️ Tentative d\'enregistrement avec champs manquants ou notes vides.');
      toast({
        title: 'Champ(s) manquant(s) ou incomplet(s)',
        description: 'Veuillez remplir toutes les informations d\'évaluation et toutes les notes avant d\'enregistrer.',
        variant: 'destructive'
      });
      return;
    }

    // Specific validation for note values
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
      // 1. Déterminer le trimestre
      console.log(`🔍 Recherche du trimestre pour la date ${date} et année ${selectedAnneeId}`);
      const trimestreRes = await fetch(`http://localhost:3000/api/trimestres/by-date?date=${date}&anneeId=${selectedAnneeId}`);
      if (!trimestreRes.ok) {
        const errorText = await trimestreRes.text();
        throw new Error(`Impossible de déterminer le trimestre: ${trimestreRes.status} - ${errorText}`);
      }
      const trimestreData = await trimestreRes.json();
      const trimestreId = trimestreData?.id;

      if (!trimestreId) {
        throw new Error("Trimestre introuvable pour cette date et année scolaire. Veuillez vérifier les trimestres configurés.");
      }
      console.log('✅ Trimestre trouvé avec ID:', trimestreId);
      // Vérification cruciale avant de construire le payload
      if (!currentMatiere || typeof currentMatiere.id === 'undefined') {
        toast({
            title: 'Erreur de données',
            description: 'La matière n\'a pas été correctement déterminée. Veuillez vérifier vos sélections.',
            variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }
      if (selectedClassId === null || professeurId === null || selectedEvalTypeId === null || !date || trimestreId === null || selectedAnneeId === null) {
        toast({
            title: 'Erreur de données',
            description: 'Un ou plusieurs champs requis sont manquants pour la création de l\'évaluation.',
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
          type: selectedEvalTypeId, // Assurez-vous que le type de l'entité backend (string/number) correspond
          dateEval: date, // Correspond à la propriété 'dateEval' de l'entité Evaluation
          trimestre: { id: trimestreId },
          anneeScolaire: { id: selectedAnneeId } // Correspond à la propriété 'anneeScolaire' de l'entité
        };
      console.log('📥 Création de l\'évaluation avec les données:', evaluationPayload);
      const evalRes = await fetch('http://localhost:3000/api/evaluation', {
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
        note: parseFloat(n.note), // Ensure note is a number
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

      // Reset form after successful save (optional, depends on UX)
      setSelectedEvalTypeId(null);
      setDate('');
      // Clear notes but keep student list if user wants to enter another evaluation for the same class/year
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
  }, [selectedAnneeId, selectedClassId, user, selectedEvalTypeId, date, currentMatiere, notes, toast]); // Depend on user

  // Determines if the "Saisie des Notes" section should be visible
  const isFormComplete = useMemo(() => {
    console.log('--- Debug: Checking isFormComplete ---');
    console.log('selectedAnneeId:', selectedAnneeId);
    console.log('selectedClassId:', selectedClassId);
    console.log('selectedEvalTypeId:', selectedEvalTypeId);
    console.log('date:', date);
    console.log('currentMatiere:', currentMatiere);
    console.log('user:', user);

    // Form is complete if all required fields are selected/filled AND user is a professor
    const complete = (
      selectedAnneeId !== null &&
      selectedClassId !== null &&
      selectedEvalTypeId !== null &&
      date !== '' &&
      currentMatiere !== null &&
      user?.role === 'professeur' // Check if user is logged in and is a professor
    );
    console.log('isFormComplete:', complete);
    return complete;
  }, [selectedAnneeId, selectedClassId, selectedEvalTypeId, date, currentMatiere, user]); // Depend on user


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
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                Année scolaire
              </label>
              <Select
                onValueChange={val => setSelectedAnneeId(val ? Number(val) : null)}
                value={selectedAnneeId !== null ? String(selectedAnneeId) : ''}
                disabled={anneesScolaires.length === 0}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {anneesScolaires.length > 0 ? (
                    anneesScolaires.map(annee => (
                      <SelectItem key={annee.id} value={String(annee.id)}>
                        {annee.libelle}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      Aucune année disponible
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <School className="h-4 w-4 mr-2 text-blue-600" />
                Classe
              </label>
              <Select
                onValueChange={val => setSelectedClassId(val ? Number(val) : null)}
                value={selectedClassId !== null ? String(selectedClassId) : ''}
                disabled={selectedAnneeId === null || classesForSelectedAnnee.length === 0}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classesForSelectedAnnee.length > 0 ? (
                    classesForSelectedAnnee.map(classe => (
                      <SelectItem key={classe.id} value={String(classe.id)}>
                        {classe.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      {selectedAnneeId === null ? "Sélectionnez une année d'abord" : "Aucune classe disponible pour cette année et ce professeur"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Champ Professeur - Affichage automatique */}
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

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Bookmark className="h-4 w-4 mr-2 text-blue-600" /> {/* Keep icon */}
                Type d'évaluation
              </label>
              <Select
                onValueChange={val => setSelectedEvalTypeId(val ? Number(val) : null)}
                value={selectedEvalTypeId !== null ? String(selectedEvalTypeId) : ''}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {evaluationTypes.map(type => (
                    <SelectItem key={type.id} value={String(type.id)}>
                      {type.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                Matière
              </label>
              <div className={`flex items-center h-10 px-3 py-2 rounded-md border ${currentMatiere ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                {currentMatiere ? (
                  <>
                    <BookOpen className="h-4 w-4 mr-2 text-blue-600" />
                    <span className="font-medium">{currentMatiere.nom}</span>
                  </>
                ) : (
                  <span className="text-gray-500">Aucune matière trouvée</span>
                )}
              </div> {/* Keep the warning */}
              {/* Adjusted warning condition */}
              {!currentMatiere && selectedAnneeId !== null && selectedClassId !== null && user?.role === 'professeur' && processedAffectations.length > 0 && (
                <p className="text-xs text-red-500 mt-1">
                  Cette combinaison (Année, Classe, Professeur connecté) n'est pas affectée à une matière.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="date-input" className="text-sm font-medium text-gray-700 flex items-center">
                <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />
                Date de l'évaluation
              </label>
              <Input
                id="date-input"
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border-blue-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Section Saisie des Notes */}
        {isFormComplete ? (
          <Card className="shadow-lg border border-gray-200 animate-fade-in-up">
            <CardHeader className="bg-white border-b border-gray-100 rounded-t-lg p-6">
              <CardTitle className="flex items-center text-2xl font-bold text-gray-700">
                <Users className="mr-3 h-6 w-6 text-blue-500" />
                Saisie des Notes:
                <span className="ml-2">
                  {allClasses.find(c => c.id === selectedClassId)?.nom || 'Chargement...'} - {currentMatiere?.nom || 'Chargement...'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {loadingEleves ? (
                <div className="flex flex-col items-center justify-center h-40 bg-gray-50 rounded-lg">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-500 mb-3" />
                  <span className="text-xl font-medium text-gray-700">Chargement des élèves...</span>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-[60%] text-gray-700 text-base">Nom de l'Élève</TableHead>
                      <TableHead className="w-[40%] text-right text-gray-700 text-base">Note sur 20</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
  {notes.length > 0 ? (
    notes.map(({ eleveId, nom, prenom, note }) => (
      <TableRow key={eleveId} className="hover:bg-gray-50 transition-colors">
        <TableCell className="font-semibold text-gray-800 py-3">{nom} {prenom}</TableCell>
        <TableCell className="text-right">
          <Input
            type="number"
            min={0}
            max={20}
            step={0.1}
            value={note}
            onChange={e => handleNoteChange(eleveId, e.target.value)}
            className="text-center font-bold text-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </TableCell>
      </TableRow>
    ))
  ) : (
    <TableRow>
      <TableCell colSpan={2} className="text-center py-8 text-gray-500 text-lg font-medium">
        {loadingEleves ? 'Chargement des élèves...' : 'Aucun élève inscrit pour la sélection actuelle.'}
      </TableCell>
    </TableRow>
  )}
</TableBody>
                </Table>
              )}
            </CardContent>

            <CardContent className="flex justify-end p-6 pt-0">
              <Button
                onClick={saveNotes}
                disabled={!isFormComplete || loadingEleves || isSaving || notes.some(n => n.note === '') || notes.length === 0} // Added notes.length === 0 check
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2 text-lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    Enregistrer les Notes
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center animate-fade-in">
            <p className="text-2xl font-semibold text-gray-700 mb-4">
              Commencez par choisir les critères de l'évaluation !
            </p>
           <p className="text-lg text-gray-600">
              Sélectionnez l'<strong>Année scolaire</strong>, la <strong>Classe</strong>, le <strong>Type d'évaluation</strong> et la <strong>Date</strong> pour afficher la liste des élèves et commencer la saisie des notes. Le professeur est automatiquement défini par votre compte.
            </p>
            <CalendarDays className="mt-6 h-16 w-16 text-blue-400 mx-auto" /> {/* Keep icon */}
          </div>
        )}
      </div>
    </div>
  );
}
