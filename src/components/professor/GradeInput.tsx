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
import { Save, Loader2, BookOpen, CalendarDays, Users, Bookmark, School, ClipboardList, User } from 'lucide-react';
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
  const [allUsers, setAllUsers] = useState<Utilisateur[]>([]);
  const [processedAffectations, setProcessedAffectations] = useState<ProcessedAffectation[]>([]);

  // --- États des sélections du formulaire ---
  const [selectedAnneeId, setSelectedAnneeId] = useState<number | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedProfesseurId, setSelectedProfesseurId] = useState<number | null>(null); // Corrected type to number
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
        console.log('Chargement des données initiales...');

        const [affectationsRes, allClassesRes, anneesRes, utilisateursRes] = await Promise.all([
          fetch('http://localhost:3000/api/affectations?include=professeur,matiere,classe,annee_scolaire'),
          fetch('http://localhost:3000/api/classes'),
          fetch('http://localhost:3000/api/annees-academiques'),
          fetch('http://localhost:3000/api/users'), // <--- Appel pour TOUS les utilisateurs (élèves et profs)
        ]);

        const checkResponse = async (res: Response, name: string) => {
          if (!res.ok) {
            const errorText = await res.text();
            console.error(`Échec du chargement des ${name}: ${res.status} - ${errorText}`);
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

        console.log('Données brutes (Affectations):', rawAffectations);
        console.log('Données brutes (Classes):', rawAllClasses);
        console.log('Données brutes (Années Académiques):', rawAnnees);
        console.log('Données brutes (Utilisateurs):', rawUtilisateurs);

        const processed = rawAffectations.map(aff => {
          // Ensure all necessary nested objects exist before processing
          if (!aff.professeur || !aff.matiere || !aff.classe || !aff.annee_scolaire) {
            console.warn('Affectation invalide (données manquantes), ignorée:', aff);
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

        console.log('Affectations traitées pour le state:', processed);
        console.log('Toutes les classes:', rawAllClasses);
        console.log('Toutes les années scolaires:', rawAnnees);
        console.log('Tous les utilisateurs (élèves et profs):', rawUtilisateurs);
        console.log('Toutes les matières:', uniqueMatieres);

      } catch (error) {
        console.error('Erreur globale lors du chargement des données initiales:', error);
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
    if (selectedAnneeId === null) {
      return [];
    }
    const uniqueClassIds = new Set(
      processedAffectations
        .filter(aff => aff.anneeScolaireId === selectedAnneeId)
        .map(aff => aff.classeId)
    );
    return allClasses.filter(cls => uniqueClassIds.has(cls.id));
  }, [selectedAnneeId, processedAffectations, allClasses]);

  // 2. Filtrer les professeurs disponibles en fonction de la classe et de l'année scolaire sélectionnées
  const professeursForSelectedClassAndAnnee = useMemo(() => {
    if (selectedAnneeId === null || selectedClassId === null) {
      return [];
    }
    const uniqueProfIds = new Set(
      processedAffectations
        .filter(aff => aff.anneeScolaireId === selectedAnneeId && aff.classeId === selectedClassId)
        .map(aff => aff.professeurId)
    );
    // Filtrer les profs de allUsers qui correspondent aux IDs trouvés
    // Ensure the user role is 'professeur'
    return allUsers.filter(user => uniqueProfIds.has(user.id) && user.role === 'professeur');
  }, [selectedAnneeId, selectedClassId, processedAffectations, allUsers]); // <--- Utilise allUsers pour filtrer les profs

  // 3. Déterminer automatiquement la matière en fonction de l'année, de la classe et du professeur sélectionnés
  useEffect(() => {
    console.log('--- Debug: Détermination de la matière courante ---');
    console.log('selectedAnneeId:', selectedAnneeId);
    console.log('selectedClassId:', selectedClassId);
    console.log('selectedProfesseurId:', selectedProfesseurId);

    if (selectedAnneeId === null || selectedClassId === null || selectedProfesseurId === null) {
      setCurrentMatiere(null);
      setEleves([]); // Reset students when criteria change
      setNotes([]);   // Reset notes
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
        setCurrentMatiere(matiereDetails);
      } else {
        console.warn('Détails de la matière introuvables pour l\'ID:', foundAffectation.matiereId);
        setCurrentMatiere(null);
      }
    } else {
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
    setEleves([]); // Always clear students and notes when these selections change
    setNotes([]);
  }, [selectedAnneeId, selectedClassId, selectedProfesseurId, processedAffectations, allMatieres, toast]);

  // --- Réinitialisation des sélections dépendantes ---
  useEffect(() => {
    setSelectedClassId(null);
    setSelectedProfesseurId(null);
  }, [selectedAnneeId]);

  useEffect(() => {
    setSelectedProfesseurId(null);
  }, [selectedClassId]);


  // --- CHARGEMENT DES ÉLÈVES (basé sur la classe et l'année sélectionnées) ---
  useEffect(() => {
    if (selectedClassId === null || selectedAnneeId === null) {
      setEleves([]);
      setNotes([]);
      return;
    }

    setLoadingEleves(true);
    console.log(`Chargement des élèves pour Classe ID: ${selectedClassId}, Année Scolaire ID: ${selectedAnneeId}`);

    // Adjust the API call to potentially include relations if not already handled by default backend behavior
    // If your backend handles the 'include' automatically based on your service logic,
    // then the current URL is fine. If not, you might need something like:
    // `http://localhost:3000/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedAnneeId}&include=utilisateur`
    fetch(`http://localhost:3000/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedAnneeId}`)
      .then(res => {
        if (!res.ok) {
          console.error('Erreur HTTP lors du chargement des inscriptions:', res.status, res.statusText);
          throw new Error('Erreur lors du chargement des inscriptions.');
        }
        return res.json();
      })
      .then((data: InscriptionApiResponse[]) => {
        console.log('Réponse API (inscriptions):', data);
        if (!Array.isArray(data)) {
          console.error('La réponse API pour les inscriptions n\'est pas un tableau:', data);
          throw new Error('Format de données invalide reçu pour les inscriptions.');
        }

        const fetchedEleves: Eleve[] = data.map(inscription => {
          // CORRECTION CLÉ ICI : Accès aux détails de l'utilisateur via l'objet imbriqué 'utilisateur'
          // et s'assurer que le rôle est 'eleve'
          if (!inscription.utilisateur || inscription.utilisateur.role !== 'eleve') {
            console.warn(`Inscription ignorée: utilisateur manquant ou rôle non 'eleve' pour l'ID d'inscription ${inscription.id}. Utilisateur trouvé:`, inscription.utilisateur);
            return null; // Return null for invalid entries
          }
          return {
            id: inscription.utilisateur.id, // Correct : accédez via .utilisateur.id
            nom: inscription.utilisateur.nom,
            prenom: inscription.utilisateur.prenom,
          };
        }).filter(Boolean) as Eleve[]; // Filter out any null entries from the map

        setEleves(fetchedEleves);
        setNotes(fetchedEleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, note: '' })));
        console.log('Élèves chargés:', fetchedEleves);
        console.log('État initial des notes créé:', fetchedEleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, note: '' })));


        if (fetchedEleves.length === 0) {
          toast({
            title: 'Aucun élève trouvé',
            description: 'Aucun élève n\'est actuellement inscrit pour la classe et l\'année scolaire sélectionnées ou les données utilisateur sont incorrectes.',
            variant: 'default',
          });
        }
      })
      .catch(error => {
        console.error("Échec du chargement des élèves:", error);
        toast({
          title: 'Erreur',
          description: error instanceof Error ? error.message : 'Impossible de charger les élèves pour la sélection actuelle.',
          variant: 'destructive'
        });
        setEleves([]); // Ensure states are cleared on error
        setNotes([]);
      })
      .finally(() => {
        setLoadingEleves(false);
      });
  }, [selectedClassId, selectedAnneeId, toast]); // Removed `allUsers` from dependencies here.

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
    // Check for general form completeness and any empty notes
    if (
      selectedAnneeId === null ||
      selectedClassId === null ||
      selectedProfesseurId === null ||
      selectedEvalTypeId === null ||
      !date ||
      currentMatiere === null ||
      notes.length === 0 || // No students loaded means nothing to save
      notes.some(n => n.note === '') // At least one note is empty
    ) {
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
      toast({
        title: 'Note(s) invalide(s)',
        description: 'Veuillez vous assurer que toutes les notes sont des nombres valides entre 0 et 20.',
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Déterminer le trimestre
      const trimestreRes = await fetch(`http://localhost:3000/api/trimestre/by-date?date=${date}&anneeId=${selectedAnneeId}`);
      if (!trimestreRes.ok) {
        const errorText = await trimestreRes.text();
        throw new Error(`Impossible de déterminer le trimestre: ${trimestreRes.status} - ${errorText}`);
      }
      const trimestreData = await trimestreRes.json();
      const trimestreId = trimestreData?.id;

      if (!trimestreId) {
        throw new Error("Trimestre introuvable pour cette date et année scolaire. Veuillez vérifier les trimestres configurés.");
      }

      // 2. Créer l'évaluation
      const evalRes = await fetch('http://localhost:3000/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matiere_id: currentMatiere.id,
          classe_id: selectedClassId,
          professeur_id: selectedProfesseurId,
          type: selectedEvalTypeId,
          date_eval: date,
          trimestre_id: trimestreId,
          annee_scolaire_id: selectedAnneeId
        })
      });

      if (!evalRes.ok) {
        const errorText = await evalRes.text();
        throw new Error(`Erreur lors de la création de l'évaluation: ${evalRes.status} - ${errorText}`);
      }
      const evalData = await evalRes.json();
      const evaluationId = evalData?.id;

      if (!evaluationId) throw new Error("L'ID de l'évaluation n'a pas été retourné par l'API.");

      // 3. Enregistrer les notes
      const notesToSave = notes.map(n => ({
        evaluation_id: evaluationId,
        etudiant_id: n.eleveId,
        note: parseFloat(n.note), // Ensure note is a number
      }));

      const noteRes = await fetch('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notesToSave)
      });

      if (!noteRes.ok) {
        const errorText = await noteRes.text();
        throw new Error(`Erreur lors de l'enregistrement des notes: ${noteRes.status} - ${errorText}`);
      }

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
      console.error("Erreur lors de l'enregistrement :", error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur inconnue est survenue lors de l\'enregistrement.',
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [selectedAnneeId, selectedClassId, selectedProfesseurId, selectedEvalTypeId, date, currentMatiere, notes, toast]);

  // Determines if the "Saisie des Notes" section should be visible
  const isFormComplete = useMemo(() => {
    return (
      selectedAnneeId !== null &&
      selectedClassId !== null &&
      selectedProfesseurId !== null &&
      selectedEvalTypeId !== null &&
      date !== '' &&
      currentMatiere !== null
    );
  }, [selectedAnneeId, selectedClassId, selectedProfesseurId, selectedEvalTypeId, date, currentMatiere]);

  if (loadingInitialData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 md:p-4 flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700">Chargement des données initiales...</span>
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
                      {selectedAnneeId === null ? "Sélectionnez une année d'abord" : "Aucune classe disponible pour cette année"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <User className="h-4 w-4 mr-2 text-blue-600" />
                Professeur
              </label>
              <Select
                onValueChange={val => setSelectedProfesseurId(val ? Number(val) : null)}
                value={selectedProfesseurId !== null ? String(selectedProfesseurId) : ''}
                disabled={selectedClassId === null || professeursForSelectedClassAndAnnee.length === 0}
              >
                <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                  <SelectValue placeholder="Sélectionner un professeur" />
                </SelectTrigger>
                <SelectContent>
                  {professeursForSelectedClassAndAnnee.length > 0 ? (
                    professeursForSelectedClassAndAnnee.map(prof => (
                      <SelectItem key={prof.id} value={String(prof.id)}>
                        {prof.nom} {prof.prenom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      {selectedClassId === null ? "Sélectionnez une classe d'abord" : "Aucun professeur disponible pour cette classe/année"}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center">
                <Bookmark className="h-4 w-4 mr-2 text-blue-600" />
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
              </div>
              {!currentMatiere && selectedAnneeId !== null && selectedClassId !== null && selectedProfesseurId !== null && (
                <p className="text-xs text-red-500 mt-1">
                  Cette combinaison (Année, Classe, Professeur) n'est pas affectée à une matière.
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
                    {notes.length === 0 && !loadingEleves ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-gray-500 text-lg font-medium">
                          Aucun élève inscrit pour la sélection actuelle.
                        </TableCell>
                      </TableRow>
                    ) : (
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
              Sélectionnez une **Année scolaire**, une **Classe**, un **Professeur**, le **Type d'évaluation** et la **Date** pour afficher la liste des élèves et la matière correspondante.
            </p>
            <CalendarDays className="mt-6 h-16 w-16 text-blue-400 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}