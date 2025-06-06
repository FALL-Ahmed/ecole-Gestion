import React, { useEffect, useState } from 'react';
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
import { useAuth } from '@/contexts/AuthContext';

// --- Définition des Types ---

// Types de base pour les entités utilisées dans les Selects
type Classe = { id: number; nom: string };
type Matiere = { id: number; nom: string };
type Eleve = { id: number; nom: string; prenom: string }; // Ajout du prénom
type EvaluationType = { id: number; nom: string };
type AnneeScolaire = { id: number; libelle: string };
type Professeur = { id: number; nom: string; prenom: string; email: string }; // Nouveau type pour les professeurs

// Type de la réponse brute de l'API /api/affectations, basé sur votre JSON
type AffectationApiResponse = {
  id: number;
  professeur: { id: number; nom: string; prenom: string; email: string; }; // Simplifié, ajoutez d'autres champs si besoin
  matiere: { id: number; nom: string; code: string } | null; // Matière peut être null selon votre BDD
  classe: { id: number; nom: string; niveau: string };
  annee_scolaire: { id: number; libelle: string; dateDebut: string; dateFin: string };
};

// Type d'Affectation pour le state interne du composant, simplifié et aplati pour faciliter la recherche
type ProcessedAffectation = {
  id: number; // ID de l'affectation elle-même
  professeurId: number;
  professeur: { id: number; nom: string; prenom: string; email: string }; // Add email here
  matiereId: number; // ID de la matière
  matiere: { id: number; nom: string }; // Objet matière pour affichage
  classeId: number; // ID de la classe
  classe: { id: number; nom: string }; // Objet classe pour affichage
  anneeScolaireId: number; // ID de l'année scolaire
  anneeScolaire: { id: number; libelle: string }; // Objet année scolaire pour affichage
};
// Type de la réponse brute de l'API /api/inscriptions
type InscriptionApiResponse = {
  id: number;
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
  classe: {
    id: number;
    nom: string;
    niveau: string;
  };
  annee_scolaire: {
    id: number;
    libelle: string;
  };
  date_inscription: string;
  actif: boolean;
};


export function GradeInput() {
  const { user } = useAuth();
  // Données initiales chargées
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [anneesScolaires, setAnneesScolaires] = useState<AnneeScolaire[]>([]);
  const [professeurs, setProfesseurs] = useState<Professeur[]>([]); // Nouveau state pour les professeurs
  const [affectations, setAffectations] = useState<ProcessedAffectation[]>([]); // Affectations traitées

  // États du formulaire
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAnneeId, setSelectedAnneeId] = useState<number | null>(null);
  const [selectedProfesseurId, setSelectedProfesseurId] = useState<number | null>(null); // Nouveau state pour le professeur sélectionné
  const [selectedEvalTypeId, setSelectedEvalTypeId] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');
  const [currentMatiere, setCurrentMatiere] = useState<Matiere | null>(null); // Matière déterminée par la sélection

  // États des notes et élèves
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<{ eleveId: number; nom: string; prenom: string; note: string }[]>([]);

  // États de chargement
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [loadingEleves, setLoadingEleves] = useState<boolean>(false);

  // Types d'évaluation fixes (peuvent être chargés depuis une API si dynamiques)
  const evaluationTypes: EvaluationType[] = [
    { id: 1, nom: 'Devoir 1' },
    { id: 2, nom: 'Devoir 2' },
    { id: 3, nom: 'Composition' },
  ];

  // --- useEffect 1: Chargement initial des affectations et des années scolaires ---
  useEffect(() => {
    const fetchInitialData = async () => {
      setLoadingInitialData(true);
      try {
        // 1. Fetch affectations
        const affectationsRes = await fetch(`http://localhost:3000/api/affectations`);
        if (!affectationsRes.ok) {
          throw new Error(`Échec du chargement des affectations: ${affectationsRes.status}`);
        }
        const rawAffectations: AffectationApiResponse[] = await affectationsRes.json();
        console.log('API Response (rawAffectations):', rawAffectations);

        // 2. Traiter, valider et enrichir les affectations pour le state
        const processedAffectations: ProcessedAffectation[] = rawAffectations.map(rawAff => {
          const isValidMatiere = rawAff.matiere && typeof rawAff.matiere === 'object' &&
            typeof rawAff.matiere.id === 'number' && !isNaN(rawAff.matiere.id) &&
            typeof rawAff.matiere.nom === 'string';

          const isValidClasse = rawAff.classe && typeof rawAff.classe === 'object' &&
            typeof rawAff.classe.id === 'number' && !isNaN(rawAff.classe.id) &&
            typeof rawAff.classe.nom === 'string';

          const isValidAnneeScolaire = rawAff.annee_scolaire && typeof rawAff.annee_scolaire === 'object' &&
            typeof rawAff.annee_scolaire.id === 'number' && !isNaN(rawAff.annee_scolaire.id) &&
            typeof rawAff.annee_scolaire.libelle === 'string';

          const isValidProfesseur = rawAff.professeur && typeof rawAff.professeur === 'object' &&
            typeof rawAff.professeur.id === 'number' && !isNaN(rawAff.professeur.id) &&
            typeof rawAff.professeur.nom === 'string' && typeof rawAff.professeur.prenom === 'string';


          if (!isValidMatiere || !isValidClasse || !isValidAnneeScolaire || !isValidProfesseur) {
            console.warn('Affectation invalide ignorée en raison de données manquantes ou malformées:', rawAff);
            return null; // Ignore l'affectation invalide
          }

          return {
  id: rawAff.id,
  professeurId: rawAff.professeur.id,
  professeur: { id: rawAff.professeur.id, nom: rawAff.professeur.nom, prenom: rawAff.professeur.prenom, email: rawAff.professeur.email }, // Include email
  matiereId: rawAff.matiere.id,
  matiere: { id: rawAff.matiere.id, nom: rawAff.matiere.nom },
  classeId: rawAff.classe.id,
  classe: { id: rawAff.classe.id, nom: rawAff.classe.nom },
  anneeScolaireId: rawAff.annee_scolaire.id,
  anneeScolaire: { id: rawAff.annee_scolaire.id, libelle: rawAff.annee_scolaire.libelle },
};
        }).filter(Boolean) as ProcessedAffectation[]; // Supprime les éléments `null`

        setAffectations(processedAffectations);
        localStorage.setItem('affectations', JSON.stringify(processedAffectations));
        console.log('Processed Affectations for state:', processedAffectations);

        // 3. Extraire les listes uniques de classes, matières, années scolaires et professeurs
        const uniqueClasses: Classe[] = [];
        const uniqueMatieres: Matiere[] = [];
        const uniqueAnneesScolaires: AnneeScolaire[] = [];
        const uniqueProfesseurs: Professeur[] = [];

        processedAffectations.forEach(aff => {
          if (!uniqueClasses.some(c => c.id === aff.classe.id)) {
            uniqueClasses.push(aff.classe);
          }
          if (!uniqueMatieres.some(m => m.id === aff.matiere.id)) {
            uniqueMatieres.push(aff.matiere);
          }
          if (!uniqueAnneesScolaires.some(a => a.id === aff.anneeScolaire.id)) {
            uniqueAnneesScolaires.push(aff.anneeScolaire);
          }
          if (!uniqueProfesseurs.some(p => p.id === aff.professeur.id)) {
            uniqueProfesseurs.push(aff.professeur);
          }
        });

        setClasses(uniqueClasses);
        setMatieres(uniqueMatieres);
        setAnneesScolaires(uniqueAnneesScolaires);
        setProfesseurs(uniqueProfesseurs); // Définir les professeurs
        console.log('Unique Classes:', uniqueClasses);
        console.log('Unique Matieres:', uniqueMatieres);
        console.log('Unique Annees Scolaires (from Affectations):', uniqueAnneesScolaires);
        console.log('Unique Professeurs (from Affectations):', uniqueProfesseurs);

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

    fetchInitialData();
  }, [toast]); // Ne dépend plus de user, car les affectations sont toutes récupérées

  // --- useEffect 2: Déterminer la matière courante basée sur les sélections ---
  useEffect(() => {
    console.log('--- Debug: Selected values changed for currentMatiere ---');
    console.log('selectedClassId:', selectedClassId);
    console.log('selectedAnneeId:', selectedAnneeId);
    console.log('selectedProfesseurId:', selectedProfesseurId); // Nouveau debug
    console.log('Current Affectations in state:', affectations);

    if (selectedClassId === null || selectedAnneeId === null || selectedProfesseurId === null) {
      setCurrentMatiere(null);
      return;
    }

    const foundAffectation = affectations.find(
      aff => aff.classeId === selectedClassId &&
      aff.anneeScolaireId === selectedAnneeId &&
      aff.professeurId === selectedProfesseurId // Ajout du filtre par professeur
    );

    console.log('Found Affectation for current selections:', foundAffectation);

    if (foundAffectation) {
      setCurrentMatiere(foundAffectation.matiere);
      setEleves([]);
      setNotes([]);
    } else {
      setCurrentMatiere(null);
      setEleves([]);
      setNotes([]);

      if (selectedClassId !== null && selectedAnneeId !== null && selectedProfesseurId !== null && affectations.length > 0) {
        toast({
          title: 'Aucune affectation trouvée',
          description: 'La combinaison sélectionnée (classe, année, professeur) n\'est pas affectée à une matière.',
          variant: 'default'
        });
      }
    }
  }, [selectedClassId, selectedAnneeId, selectedProfesseurId, affectations]); // Dépend de `affectations` et `selectedProfesseurId`

  // --- useEffect 3: Chargement des élèves basé sur la classe et l'année sélectionnées ---
  useEffect(() => {
    if (selectedClassId === null || selectedAnneeId === null || loadingInitialData) {
      setEleves([]);
      setNotes([]);
      return;
    }

    setLoadingEleves(true);
    fetch(
      `http://localhost:3000/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedAnneeId}`
    )
      .then(res => {
        if (!res.ok) {
          console.error('Erreur HTTP lors du chargement des inscriptions:', res.status, res.statusText);
          throw new Error('Erreur lors du chargement des inscriptions.');
        }
        return res.json();
      })
      .then((data: InscriptionApiResponse[]) => {
        console.log('API Response (inscriptions):', data);
        const fetchedEleves: Eleve[] = data.map(inscription => ({
          id: inscription.utilisateur.id,
          nom: inscription.utilisateur.nom,
          prenom: inscription.utilisateur.prenom,
        }));

        setEleves(fetchedEleves);
        setNotes(fetchedEleves.map(e => ({ eleveId: e.id, nom: e.nom, prenom: e.prenom, note: '' })));
      })
      .catch((error) => {
        console.error("Échec du chargement des élèves:", error);
        toast({
          title: 'Erreur',
          description: 'Impossible de charger les élèves pour la sélection actuelle.',
          variant: 'destructive'
        });
        setEleves([]);
        setNotes([]);
      })
      .finally(() => {
        setLoadingEleves(false);
      });
  }, [selectedClassId, selectedAnneeId, loadingInitialData]);

  const handleNoteChange = (eleveId: number, note: string) => {
    setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note } : n)));
  };

  const saveNotes = async () => {
    if (
      selectedClassId === null ||
      selectedEvalTypeId === null ||
      selectedAnneeId === null ||
      !date ||
      currentMatiere === null ||
      selectedProfesseurId === null || // Assurez-vous que le professeur est sélectionné
      notes.length === 0 ||
      notes.some(n => n.note === '')
    ) {
      toast({
        title: 'Champ(s) manquant(s) ou incomplet(s)',
        description: 'Veuillez remplir toutes les informations d\'évaluation et toutes les notes avant d\'enregistrer.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // 🔍 Étape 1 : Obtenir le trimestre selon la date
      const trimestreRes = await fetch(`http://localhost:3000/api/trimestre/by-date?date=${date}&anneeId=${selectedAnneeId}`);
      if (!trimestreRes.ok) throw new Error("Impossible de déterminer le trimestre.");
      const trimestreData = await trimestreRes.json();
      const trimestreId = trimestreData?.id;

      if (!trimestreId) {
        throw new Error("Trimestre introuvable pour cette date.");
      }

      // 📥 Étape 2 : Créer l’évaluation
      const evalRes = await fetch('http://localhost:3000/api/evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matiere_id: currentMatiere.id,
          classe_id: selectedClassId,
          professeur_id: selectedProfesseurId, // Utilise le professeur sélectionné
          type: selectedEvalTypeId,
          date_eval: date,
          trimestre_id: trimestreId,
          annee_scolaire_id: selectedAnneeId
        })
      });

      if (!evalRes.ok) throw new Error("Erreur lors de la création de l'évaluation.");

      const evalData = await evalRes.json();
      const evaluationId = evalData?.id;

      if (!evaluationId) throw new Error("ID de l'évaluation non retourné.");

      // 📝 Étape 3 : Enregistrer les notes liées à cette évaluation
      const noteRes = await fetch('http://localhost:3000/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(notes.map(n => ({
          evaluation_id: evaluationId,
          etudiant_id: n.eleveId,
          note: n.note,

        })))
      });

      if (!noteRes.ok) throw new Error("Erreur lors de l'enregistrement des notes.");

      toast({
        title: 'Succès',
        description: 'Évaluation et notes enregistrées avec succès !',
        variant: 'default'
      });

    } catch (error: any) { // Explicitly type error as 'any' or 'unknown'
      console.error("Erreur lors de l'enregistrement :", error);
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur inconnue est survenue.',
        variant: 'destructive'
      });
    }
  };


  const isFormComplete =
    selectedClassId !== null &&
    selectedEvalTypeId !== null &&
    selectedAnneeId !== null &&
    selectedProfesseurId !== null && // Ajout de la condition pour le professeur
    date !== '' &&
    currentMatiere !== null;

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

        {/* Section Informations de l'Évaluation - Version améliorée */}
        <Card className="w-full border border-blue-100 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="bg-blue-600 text-white p-6">
            <div className="flex items-center space-x-3">
              <ClipboardList className="h-6 w-6" />
              <CardTitle className="text-xl font-semibold">Critères de l'Évaluation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Champs de sélection avec icônes */}
            {[
              {
                label: 'Année scolaire',
                icon: <CalendarDays className="h-4 w-4 mr-2 text-blue-600" />,
                value: selectedAnneeId,
                onChange: setSelectedAnneeId,
                items: anneesScolaires,
                placeholder: 'Sélectionner une année'
              },
              {
                label: 'Classe',
                icon: <School className="h-4 w-4 mr-2 text-blue-600" />,
                value: selectedClassId,
                onChange: setSelectedClassId,
                items: classes,
                placeholder: 'Sélectionner une classe'
              },
              
              {
                label: 'Professeur', // Nouveau champ de sélection
                icon: <User className="h-4 w-4 mr-2 text-blue-600" />,
                value: selectedProfesseurId,
                onChange: setSelectedProfesseurId,
                items: professeurs,
                placeholder: 'Sélectionner un professeur'
              },
              {
                label: 'Type d\'évaluation',
                icon: <Bookmark className="h-4 w-4 mr-2 text-blue-600" />,
                value: selectedEvalTypeId,
                onChange: setSelectedEvalTypeId,
                items: evaluationTypes,
                placeholder: 'Sélectionner un type'
              },
            ].map((field, index) => (
              <div key={index} className="space-y-2">
                <label className="text-sm font-medium text-gray-700 flex items-center">
                  {field.icon}
                  {field.label}
                </label>
                <Select
                  onValueChange={val => {
                    const numVal = val ? Number(val) : null;
                    field.onChange(numVal);
                  }}
                  value={field.value !== null ? String(field.value) : ''}
                  disabled={field.items.length === 0 && field.label !== 'Type d\'évaluation'}
                >
                  <SelectTrigger className="w-full border-blue-200 focus:ring-blue-500">
                    <SelectValue placeholder={field.placeholder} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.items.length > 0 ? (
                      field.items.map(item => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {'nom' in item && 'prenom' in item ? `${item.nom} ${item.prenom}` : item.nom || item.libelle}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="disabled" disabled>
                        Aucun(e) {field.label.toLowerCase()} disponible
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}

            {/* Affichage de la matière avec état */}
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
                  'Aucune matière trouvée'
                )}
              </div>
              {!currentMatiere && selectedClassId !== null && selectedAnneeId !== null && selectedProfesseurId !== null && (
                <p className="text-xs text-red-500 mt-1">
                  Combinaison classe/année/professeur non affectée à une matière
                </p>
              )}
            </div>

            {/* Champ Date amélioré */}
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
                  {classes.find(c => c.id === selectedClassId)?.nom} - {currentMatiere?.nom}
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
                    {notes.length === 0 ? (
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
                disabled={!isFormComplete || loadingEleves || notes.some(n => n.note === '')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2 text-lg"
              >
                <Save size={20} />
                Enregistrer les Notes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 text-center animate-fade-in">
            <p className="text-2xl font-semibold text-gray-700 mb-4">
              Commencez par choisir les critères de l'évaluation !
            </p>
            <p className="text-lg text-gray-600">
              Sélectionnez une <strong>Classe</strong>, l'<strong>Année scolaire</strong>, le <strong>Type d'évaluation</strong> et la <strong>Date</strong> pour afficher la liste des élèves et commencer la saisie des notes.
            </p>

            <CalendarDays className="mt-6 h-16 w-16 text-blue-400 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
}