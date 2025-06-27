import React, { useState, useEffect, ReactNode, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { Plus, Users, Award, Calendar, User, ArrowRightIcon, SaveIcon, ClipboardListIcon, Pencil, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Input } from "@/components/ui/input"; // Assurez-vous que Input est importé
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Import DialogDescription if you're using it
  DialogFooter,      // Import DialogFooter if you're using it
} from "@/components/ui/dialog"; 

interface SchoolManagementProps {
  onNavigate: (sectionId: string) => void;
}

export default function SchoolManagement({ onNavigate }: SchoolManagementProps) {
  const [activeTab, setActiveTab] = useState("annees");
  const [isAddClasseOpen, setIsAddClasseOpen] = useState(false);
  const [isAddCoeffOpen, setIsAddCoeffOpen] = useState(false);
  const [isAffectProfOpen, setIsAffectProfOpen] = useState(false);
  const [isAddAnneeOpen, setIsAddAnneeOpen] = useState(false);
  const [affectations, setAffectations] = useState([]);
  const [filterProf, setFilterProf] = useState("");
  const [filterClasse, setFilterClasse] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [coefficients, setCoefficients] = useState([]);
  const [openAnnee, setOpenAnnee] = useState<string | null>(null);
  const [loadingTrimestres, setLoadingTrimestres] = useState(false);
  const [coeffData, setCoeffData] = useState<{ [matiereId: string]: number | '' }>({});
  const [anneeScolaireId, setAnneeScolaireId] = useState(''); // ✅ PAS null
  const [anneeScolaireFiltre, setAnneeScolaireFiltre] = useState(""); // ou null
  const [currentConfiguredAcademicYearId, setCurrentConfiguredAcademicYearId] = useState<string | null>(null);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<string | null>(null);
  const [isConfirmAnneeOpen, setIsConfirmAnneeOpen] = useState(false);
const [anneeToConfirm, setAnneeToConfirm] = useState<{ libelle: string; debut: string; fin: string } | null>(null);
const [isConfirmTrimestresOpen, setIsConfirmTrimestresOpen] = useState(false);
const [trimestresToConfirm, setTrimestresToConfirm] = useState<Array<{ nom: string; date_debut: string; date_fin: string }>>([]);
const [isDeleteAnneeDialogOpen, setIsDeleteAnneeDialogOpen] = useState(false);
const [anneeToDelete, setAnneeToDelete] = useState<{ id: string; libelle: string } | null>(null);
  // Utiliser un `useEffect` pour ouvrir la boîte de dialogue de manière fiable
  // lorsque `anneeToDelete` est défini.
  useEffect(() => {
    if (anneeToDelete) {
      setIsDeleteAnneeDialogOpen(true);
    }
  }, [anneeToDelete]);

  const [isEditCoeffDialogOpen, setIsEditCoeffDialogOpen] = useState(false);

  const [currentEditingCoeff, setCurrentEditingCoeff] = useState<{
    
  id: number;
  classeNom: string;
  matiereNom: string;
  coefficient: number | '';
  classeId?: number;
  matiereId?: number;
} | null>(null);



  // States pour les formulaires
  const [classeNom, setClasseNom] = useState("");
  const [classeNiveau, setClasseNiveau] = useState("Primaire");
  const [coeffClasse, setCoeffClasse] = useState("");
  const [selectedMatieres, setSelectedMatieres] = useState<{ [id: string]: number }>({});
  const [coeffError, setCoeffError] = useState("");

  const [coeffMatiere, setCoeffMatiere] = useState("");
  const [coefficient, setCoefficient] = useState(1);
  const [affectProf, setAffectProf] = useState("");
  const [affectMatiere, setAffectMatiere] = useState("");
  const [affectClasses, setAffectClasses] = useState<string[]>([]);
  const [affectAnnee, setAffectAnnee] = useState("");

  const [openClasse, setOpenClasse] = useState<string | null>(null);
  // Étape 1
const [anneeLibelle, setAnneeLibelle] = useState("");
const [anneeDebut, setAnneeDebut] = useState("");
const [anneeFin, setAnneeFin] = useState(""); // <-- Correction : Déclaré comme un état



// Étape 2
const [isAddTrimestreOpen, setIsAddTrimestreOpen] = useState(false);
const [trimestre1Debut, setTrimestre1Debut] = useState("");
const [trimestre1Fin, setTrimestre1Fin] = useState("");
const [trimestre2Debut, setTrimestre2Debut] = useState("");
const [trimestre2Fin, setTrimestre2Fin] = useState("");
const [trimestre3Debut, setTrimestre3Debut] = useState("");
const [trimestre3Fin, setTrimestre3Fin] = useState("");
const [openAnneeTrimestresId, setOpenAnneeTrimestresId] = useState<string | null>(null);

const [trimestres, setTrimestres] = useState<{
    id: string;
    // annee_scolaire_id: number; // <-- Supprimer cette ligne
    nom: string;
    date_debut: string;
    date_fin: string;
    anneeScolaire: { // <-- Ajouter cette structure
        id: number;
        libelle: string;
        date_debut: string;
        date_fin: string;
    };
  }[]>([]);

// Helper function to format academic year display consistently
const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
  if (!annee || !annee.date_debut || !annee.date_fin) {
    return annee?.libelle || "Année inconnue";
  }
  const startYear = new Date(annee.date_debut).getFullYear();
  const endYear = new Date(annee.date_fin).getFullYear();
  if (annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear))) {
      return annee.libelle;
  }
  return `${startYear}-${endYear}`;
};
// Feedback
const [successMsg, setSuccessMsg] = useState("");

  // Données récupérées depuis l'API
  const [classes, setClasses] = useState<
  { id: string; nom: string; annee_scolaire_id: string }[]
>([]);

  const [matieres, setMatieres] = useState<{ id: string, nom: string }[]>([]);
  const [annees, setAnnees] = useState<{
    nom: ReactNode;
    date_fin: string;
    date_debut: string; id: string, libelle: string
}[]>([]);
  const [profs, setProfs] = useState<{ id: string, nom: string, prenom: string }[]>([]);
  





// Définir refreshCoefficients ici pour qu'il soit accessible partout dans le composant
const refreshCoefficients = () => {
  fetch(`${API_URL}/api/coefficientclasse`)
    .then(res => res.json())
    .then(data => setCoefficients(data));
};
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

useEffect(() => {
  const fetchData = async () => {
    try {
      let res, data;

      res = await fetch(`${API_URL}/api/classes`);
      if (!res.ok) throw new Error("Erreur classes : " + res.status);
      data = await res.json();
      setClasses(data);

      res = await fetch(`${API_URL}/api/matieres`);
      if (!res.ok) throw new Error("Erreur matieres : " + res.status);
      data = await res.json();
      setMatieres(data);

      res = await fetch(`${API_URL}/api/annees-academiques`);
      if (!res.ok) throw new Error("Erreur annees : " + res.status);
      data = await res.json();
      setAnnees(data);

      res = await fetch(`${API_URL}/api/users`);
      if (!res.ok) throw new Error("Erreur users : " + res.status);
      data = await res.json();
      setProfs(data.filter(u => u.role === "professeur"));

      res = await fetch(`${API_URL}/api/trimestres`);
      if (!res.ok) throw new Error("Erreur trimestres : " + res.status);
      data = await res.json();
      setTrimestres(data);

      res = await fetch(`${API_URL}/api/affectations`);
      if (!res.ok) throw new Error("Erreur affectations : " + res.status);
      data = await res.json();
      setAffectations(data);

      // Charger les coefficients
      refreshCoefficients();

      // Fetch current academic year configuration
      const configRes = await fetch(`${API_URL}/api/configuration`);
      if (configRes.ok) {
        const configData = await configRes.json(); // Correction: utiliser configRes.json()
        if (configData && configData.annee_scolaire && configData.annee_scolaire.id) {
          setCurrentConfiguredAcademicYearId(String(configData.annee_scolaire.id));
        } else {
          setCurrentConfiguredAcademicYearId(null);
        }
      } else if (configRes.status === 404) {
        setCurrentConfiguredAcademicYearId(null);
        // Optionnel: toast.info("Configuration de l'année scolaire non trouvée. Les classes ne seront pas filtrées par défaut pour les coefficients.");
      } else {
        console.error("Erreur chargement configuration année: " + configRes.status);
        setCurrentConfiguredAcademicYearId(null);
      }

    } catch (error) {
      console.error("Erreur fetch global :", error);
      // Tu peux ici setter des états vides ou afficher un message d'erreur global
    }
  };

  fetchData();
}, []);
useEffect(() => {
    if (isAddClasseOpen) {
      setClasseNom("");
      setClasseNiveau("Primaire");
      setAnneeScolaireId("");
    }
  }, [isAddClasseOpen]);

  const classesForCoeffDialog = useMemo(() => {
    if (!currentConfiguredAcademicYearId) {
      // Si aucune année scolaire actuelle n'est configurée globalement,
      // on affiche toutes les classes pour ne pas bloquer.
      return classes;
    }
    return classes.filter(c => String(c.annee_scolaire_id) === currentConfiguredAcademicYearId);
  }, [classes, currentConfiguredAcademicYearId]);



  function sortAnnees(annees) {
  // Trie les années numérotées, puis "4ème année (Brevet)", puis "Terminale", puis "Autre"
  const order = (annee) => {
    if (annee === "Terminale") return 99;
    if (annee === "4ème année (Brevet)") return 4;
    const match = annee.match(/^(\d+)/);
    return match ? parseInt(match[1], 10) : 100;
  };
  return Object.keys(annees).sort((a, b) => order(a) - order(b));
}

// Ajout de la fonction groupClassesByNiveauAndAnnee
function groupClassesByNiveauAndAnnee(classes: { id: string, nom: string, niveau?: string }[]) {
  // { niveau: { annee: [classes...] } }
  const grouped: { [niveau: string]: { [annee: string]: { id: string, nom: string }[] } } = {};
  classes.forEach(classe => {
    const niveau = (classe.niveau || "Autre").toLowerCase();
    const match = classe.nom.match(/^(\d+)/);
    let annee = "Autre";
    if (match) {
      if (match[1] === "4") {
        annee = "4ème année (Brevet)";
      } else if (match[1] === "7") {
        annee = "Terminale";
      } else {
        annee = `${match[1]}ème année`;
      }
    }
    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(classe);
  });
  return grouped;
}

  function groupCoefficientsByNiveauEtAnnee() {
  // { niveau: { annee: [coefs...] } }
  const grouped = {};
  coefficients.forEach(c => {
    const nomClasse = c.classe?.nom || "";
    const niveau = c.classe?.niveau || "Autre";
    const match = nomClasse.match(/^(\d+)/);
    let annee = "Autre";
    if (match) {
      if (match[1] === "4") {
        annee = "4ème année (Brevet)";
      } else if (match[1] === "7") {
        annee = "Terminale";
      } else {
        annee = `${match[1]}ème année`;
      }
    }
    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(c);
  });
  return grouped;
}


function groupCoefficientsByAnnee() {
  // On regroupe par premier chiffre du nom de la classe liée au coefficient
  const grouped = {};
  coefficients.forEach(c => {
    // On récupère le nom de la classe liée au coefficient
    const nomClasse = c.classe?.nom || "";
    const match = nomClasse.match(/^(\d+)/);
    let annee = "Autre";
    if (match) {
      if (match[1] === "4") {
        annee = "4ème année (Brevet)";
      } else if (match[1] === "7") {
        annee = "Terminale";
      } else {
        annee = `${match[1]}ème année`;
      }
    }
    if (!grouped[annee]) grouped[annee] = [];
    grouped[annee].push(c);
  });
  return grouped;
}
const handleOpenEditCoefficientDialog = (coeffEntry: any) => {
  setCurrentEditingCoeff({
    id: coeffEntry.id,
    classeNom: coeffEntry.classe.nom,
    matiereNom: coeffEntry.matiere.nom,
    coefficient: coeffEntry.coefficient,
    classeId: coeffEntry.classe.id, 
    matiereId: coeffEntry.matiere.id, 
  });
  setIsEditCoeffDialogOpen(true);
};

const handleConfirmSaveTrimestres = async () => {
  // Reconstruire les données complètes des trimestres à envoyer
  const trimestresPayload = [
    { nom: "Trimestre 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin, annee_scolaire_id: parseInt(anneeScolaireId) },
    { nom: "Trimestre 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin, annee_scolaire_id: parseInt(anneeScolaireId) },
    { nom: "Trimestre 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin, annee_scolaire_id: parseInt(anneeScolaireId) }
  ].filter(t => t.date_debut && t.date_fin); // S'assurer que les dates sont remplies

  if (trimestresPayload.length !== 3) {
    toast.error("Veuillez renseigner les dates pour les 3 trimestres.");
    setIsConfirmTrimestresOpen(false); // Fermer le dialogue de confirmation
    return;
  }

  const nouveauxTrimestresPromises = trimestresPayload.map(trimestre =>
    fetch("http://localhost:3000/api/trimestres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trimestre)
    }).then(res => {
      if (!res.ok) return res.json().then(err => Promise.reject(err));
      return res.json();
    })
  );

  try {
    const results = await Promise.all(nouveauxTrimestresPromises);
    setTrimestres(prev => [...prev, ...results]);
    toast.success("Trimestres ajoutés avec succès !");
    
    // Réinitialiser les champs du formulaire des trimestres
    setTrimestre1Debut("");
    setTrimestre1Fin("");
    setTrimestre2Debut("");
    setTrimestre2Fin("");
    setTrimestre3Debut("");
    setTrimestre3Fin("");
    setAnneeLibelle(""); // Aussi réinitialiser les champs de l'année
    setAnneeDebut("");
    setAnneeFin("");


  } catch (error: any) {
    toast.error(`Erreur lors de l'ajout des trimestres: ${error.message || 'Erreur inconnue'}`);
  } finally {
    setIsConfirmTrimestresOpen(false);
    setIsAddTrimestreOpen(false); // Ferme le dialogue principal des trimestres
    setTrimestresToConfirm([]);
  }
};

const handleConfirmSaveAnnee = async () => {
  if (!anneeToConfirm) return;

  try {
    const response = await fetch(`${API_URL}/api/annees-academiques`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ libelle: anneeToConfirm.libelle, date_debut: anneeToConfirm.debut, date_fin: anneeToConfirm.fin })
    });

    if (response.ok) {
      const newAnnee = await response.json();
      setAnnees(prev => [...prev, newAnnee]);
      setAnneeScolaireId(String(newAnnee.id)); // Assurez-vous que anneeScolaireId attend un string si l'ID est un nombre
      
      toast.success("Année ajoutée avec succès ! Passage à l'étape des trimestres.");
      
      // Passer à l'étape suivante
      setIsAddAnneeOpen(false); // Ferme le dialogue de l'étape 1
      setIsAddTrimestreOpen(true); // Ouvre le dialogue de l'étape 2
    } else {
      const errorData = await response.json();
      toast.error(`Erreur lors de l'ajout de l'année: ${errorData.message || response.statusText}`);
    }
  } catch (error: any) {
    toast.error(`Erreur lors de l'ajout de l'année: ${error.message}`);
  } finally {
    setIsConfirmAnneeOpen(false);
    setAnneeToConfirm(null);
  }
};

const handleDeleteAnnee = async () => {
  if (!anneeToDelete) return;

  try {
    const response = await fetch(`${API_URL}/api/annees-academiques/${anneeToDelete.id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Réponse non-JSON du serveur.' }));
      throw new Error(errorData.message || `Échec de la suppression de l'année scolaire. Statut: ${response.status}`);
    }

    // Mettre à jour l'état local pour refléter la suppression
    setAnnees(prev => prev.filter(a => a.id !== anneeToDelete.id));
    setTrimestres(prev => prev.filter(t => String(t.anneeScolaire?.id) !== anneeToDelete.id));
    setClasses(prev => prev.filter(c => c.annee_scolaire_id !== anneeToDelete.id));
    setAffectations(prev => prev.filter(aff => String(aff.annee_scolaire?.id) !== anneeToDelete.id));
    
    const remainingClassIds = new Set(classes.filter(c => c.annee_scolaire_id !== anneeToDelete.id).map(c => c.id));
    setCoefficients(prev => prev.filter(coeff => remainingClassIds.has(String(coeff.classe?.id))));

    toast.success(`L'année scolaire "${anneeToDelete.libelle}" et toutes ses données associées ont été supprimées.`);
  } catch (error) {
    console.error("Erreur lors de la suppression de l'année scolaire:", error);
    toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
  } finally {
    setIsDeleteAnneeDialogOpen(false);
    setAnneeToDelete(null);
  }
};

function getCoefficientsByClasse(classeId) {
  return coefficients
    .filter(c => c.classe?.id == classeId)
    .map(c => ({
      matiere: c.matiere,
      coefficient: c.coefficient
    }));
}

  function handleAnneeCardClick(annee: { date_fin: string; date_debut: string; id: string; libelle: string; }) {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="w-full py-10 px-4">
      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6 text-black tracking-tight">
            Gestion scolaire
          </h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 shadow dark:border-gray-700 dark:from-gray-900 dark:to-gray-800 sm:grid-cols-4 md:h-12">
            <TabsTrigger
              value="annees"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Calendar className="h-5 w-5" /> Années
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Users className="h-5 w-5" /> Classes
            </TabsTrigger>
            <TabsTrigger
              value="coefficients"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Award className="h-5 w-5" /> Coefficients
            </TabsTrigger>
            <TabsTrigger
              value="affectations"
              className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <User className="h-5 w-5" /> Professeurs
            </TabsTrigger>
            
          </TabsList>

          {/* Onglet Classes */}
          <TabsContent value="classes">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
        <Users className="h-6 w-6" /> Gestion des classes
      </CardTitle>
      <div className="mt-1 text-sm text-blue-500 dark:text-blue-300">
        Ajoutez, visualisez et organisez les classes par année scolaire.
      </div>
    </CardHeader>

    

    <CardContent>
       {/* Barre d'outils : Filtre et Bouton Ajouter */}
      <div className="mb-6 flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-800/50 md:flex-row md:items-center">
        <div className="w-full md:w-auto">
          <label htmlFor="annee-select-classes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Filtrer par année scolaire
          </label>
          <select
            id="annee-select-classes"
            value={anneeScolaireFiltre}
            onChange={(e) => setAnneeScolaireFiltre(e.target.value)}
            className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white md:w-64"
          >
            <option value="">Choisir une année</option>
            {annees.map((a) => (
              <option key={a.id} value={String(a.id)}>{a.libelle}</option>
            ))}
          </select>
        </div>
        <Button
          className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transition-transform duration-300 hover:scale-105 md:w-auto"
          onClick={() => setIsAddClasseOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une classe
        </Button>
       
      </div>
{successMsg && (
        <div className="mb-4 px-6 text-center font-semibold text-green-700 dark:text-green-300">
          {successMsg}
        </div>
      )}

      <div className="px-6">
        {/* Si aucune année sélectionnée */}
        {!anneeScolaireFiltre ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-10 italic font-semibold">
            Veuillez sélectionner une année scolaire pour voir les classes.
          </p>
        ) : classes.length === 0 ? (
          <div className="text-gray-500 italic text-center py-10">
            Aucune classe trouvée.
          </div>
        ) : (
          (() => {
            const classesFiltrees = classes.filter(
              (c) => String(c.annee_scolaire_id) === anneeScolaireFiltre
            );

            if (classesFiltrees.length === 0) {
              return (
                <div className="text-red-500 font-semibold text-center py-6">
                  Aucune classe pour cette année scolaire.
                </div>
              );
            }

            const grouped = groupClassesByNiveauAndAnnee(classesFiltrees);

            const sortedAnneesKeys = (anneesObj) =>
              Object.keys(anneesObj).sort();

            return Object.entries(grouped).map(([niveau, annees]) => (
              <div key={niveau} className="mb-10">
                <h3 className="text-xl font-bold text-blue-700 mb-4 capitalize flex items-center gap-2">
                  <Users className="h-6 w-6" /> {niveau}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {sortedAnneesKeys(annees).map((annee) => (
                    <div
                      key={annee}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow p-4
                        transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        <span className="text-base font-semibold text-indigo-700 dark:text-indigo-200">
                          {annee}
                        </span>
                      </div>

                      <ul className="flex flex-wrap gap-3">
                        {annees[annee].map((classe) => (
                          <li
                            key={classe.id}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow-sm font-semibold text-blue-900 dark:text-blue-100 text-base
                              transition-colors duration-300 ease-out hover:bg-blue-100 dark:hover:bg-blue-900 hover:scale-105"
                          >
                            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />
                            {classe.nom}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()
        )}
      </div>
    </CardContent>
  </Card>
</TabsContent>



          {/* Onglet Coefficients */}
          <TabsContent value="coefficients">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
        <Award className="h-6 w-6" /> Coefficients par classe
      </CardTitle>
      <div className="text-sm text-blue-500 dark:text-blue-300 mt-1">
        Cliquez sur une classe pour voir ses matières et coefficients.
      </div>
    </CardHeader>
    <CardContent>
  <Button
    className="mb-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition"
    onClick={() => setIsAddCoeffOpen(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Ajouter un coefficient
  </Button>
  <div>
{Object.keys(groupCoefficientsByNiveauEtAnnee()).length === 0 ? (
  <div className="text-gray-500 italic">Aucun coefficient trouvé.</div>
) : (
  Object.entries(groupCoefficientsByNiveauEtAnnee()).map(([niveau, annees]) => (
    <div key={niveau} className="mb-10">
      <h3 className="text-xl font-bold text-blue-700 mb-4 capitalize flex items-center gap-2">
        <Users className="h-6 w-6" /> {niveau}
      </h3>
      {sortAnnees(annees).map(annee => (
        <div
          key={annee}
          className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow p-6 transition-all duration-300 hover:shadow-xl"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-lg font-bold shadow">
              <Calendar className="h-6 w-6" />
            </span>
            <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {annee}
            </span>
          </div>
          <div>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 font-semibold shadow hover:bg-blue-200 dark:hover:bg-blue-900 transition mb-2"
              onClick={() => setOpenAnnee(openAnnee === niveau + annee ? null : niveau + annee)}
            >
              <Award className="h-5 w-5" />
              {openAnnee === niveau + annee ? "Masquer les matières" : "Voir les matières"}
              <span className="ml-2">{openAnnee === niveau + annee ? "▲" : "▼"}</span>
            </button>
            {openAnnee === niveau + annee && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                {(() => {
                  // Prend la première classe de l'année
                  const classesForNiveauAnnee = groupClassesByNiveauAndAnnee(classes)[niveau]?.[annee] ?? [];
if (classesForNiveauAnnee.length === 0) return <span className="text-xs text-gray-400 italic">Aucune matière</span>;

// On filtre tous les coefficients pour les classes de ce groupe
const coefs = coefficients.filter(c =>
  classesForNiveauAnnee.some(classe => classe.id === c.classe?.id)
);
if (coefs.length === 0) return <span className="text-xs text-gray-400 italic">Aucun coefficient</span>;

                  // Éviter les doublons de matières (on garde la première occurrence par matiere_id)
const matieresUniques = Array.from(
  new Map(coefs.map(item => [item.matiere.id, item])).values()
);

return matieresUniques.map(c => (
  <li
    key={c.matiere.id}
    className="flex flex-col items-start gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-800 hover:shadow-lg"
  >
    <div className="flex items-center gap-2 mb-1">
      <Award className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
      <span className="font-semibold text-blue-900 dark:text-blue-100 text-base">{c.matiere.nom}</span>
    </div>
    <span className="px-3 py-1 rounded-full bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 text-xs font-bold shadow">
      Coefficient&nbsp;{c.coefficient}
    </span>
    <div className="ml-auto flex items-center gap-1">
    <Button
      variant="ghost"
      size="sm"
      className="p-1 h-7 w-7 text-blue-600 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-700"
      onClick={(e) => { e.stopPropagation(); handleOpenEditCoefficientDialog(c); }}
    >
      <Pencil className="h-4 w-4" />
    </Button>
    
    </div>
  </li>
));

                })()}
              </ul>
            )}
          </div>
        </div>
      ))}
    </div>
  ))
)}
  </div>
</CardContent>
  </Card>
</TabsContent>

          {/* Onglet Affectation des professeurs */}
<TabsContent value="affectations">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
        <User className="h-6 w-6" /> Affectation des professeurs
      </CardTitle>
      {/* Filtres en haut à droite */}
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:flex-row sm:items-center">
        
        <select
  className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800 sm:w-auto"
  value={filterAnnee}
  onChange={e => setFilterAnnee(e.target.value)}
>
  <option value="">Années</option>
  {annees.map(annee => (
    <option key={annee.id} value={annee.id}>
      {annee.libelle}
    </option>
  ))}
</select>
        <select
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800 sm:w-auto"
          value={filterClasse}
          onChange={e => setFilterClasse(e.target.value)}
          disabled={!filterAnnee}

        >
         <option value="">Toutes les classes</option>
          {/* Filtrer les classes ici en fonction de filterAnnee */}
          {classes
            .filter(classe => filterAnnee ? String(classe.annee_scolaire_id) === filterAnnee : true)
            .map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.nom}
              </option>
            ))}
        </select>
        <select
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-1 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800 sm:w-auto"
          value={filterProf}
          onChange={e => setFilterProf(e.target.value)}
        >
          <option value="">Professeurs</option>
          {profs.map(prof => (
            <option key={prof.id} value={prof.id}>
              {prof.nom} {prof.prenom}
            </option>
          ))}
        </select>
      </div>
    </CardHeader>
    <CardContent>
  <Button
    className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition"
    onClick={() => setIsAffectProfOpen(true)}
  >
    <Plus className="h-4 w-4 mr-2" />
    Affecter un professeur
  </Button>
  {(() => {
     // Si aucun filtre Année n'est sélectionné, afficher un message d'invite
    if (!filterAnnee) {
      return (
        <div className="italic text-gray-500 dark:text-gray-400 text-center py-8">
          Veuillez sélectionner une année scolaire pour afficher les affectations.
        </div>
      );
    }
    function groupAffectationsByProf(affectations) {
      const grouped = {};
      affectations.forEach(aff => {
        const profId = aff.professeur?.id;
       
        if (!grouped[profId]) {
          grouped[profId] = {
            professeur: aff.professeur,
            matieres: {},
          };
        }
        const matiereId = aff.matiere?.id;
        if (!grouped[profId].matieres[matiereId]) {
          grouped[profId].matieres[matiereId] = {
            matiere: aff.matiere,
            classes: [],
            annee: aff.annee_scolaire,
          };
        }
        grouped[profId].matieres[matiereId].classes.push(aff.classe);
      });
      return grouped;
    }
    const filteredAffectations = affectations.filter(aff =>
      (!filterProf || aff.professeur?.id == filterProf) &&
      (!filterClasse || aff.classe?.id == filterClasse) &&
      (!filterAnnee || aff.annee_scolaire?.id == filterAnnee)
    );
    const grouped = groupAffectationsByProf(filteredAffectations);

    type ProfGroup = {
      professeur: { id: string; nom: string; prenom: string };
      matieres: {
        [matiereId: string]: {
          matiere: { id: string; nom: string };
          classes: { id: string; nom: string }[];
          annee: { id: string; libelle: string };
        };
      };
    };
    const profGroups = Object.values(grouped) as ProfGroup[];
    return profGroups.length === 0 ? (
      <div className="italic text-gray-500 dark:text-gray-400 text-center py-8">
        Aucune affectation trouvée pour les filtres sélectionnés.</div>
     ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {profGroups.map(profGroup => (
          <div
  key={profGroup.professeur.id}
  className="p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-800 shadow-lg
    transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
  style={{ animation: "fadeIn 0.7s" }}
>
            <div className="flex items-center gap-4 mb-4">
              <div className="rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 text-white w-14 h-14 flex items-center justify-center text-2xl font-bold uppercase shadow-lg border-4 border-white">
                {profGroup.professeur.nom[0]}
              </div>
              <div>
                <div className="font-extrabold text-blue-900 dark:text-blue-100 text-xl tracking-wide">
                  {profGroup.professeur.nom} {profGroup.professeur.prenom}
                </div>
                <div className="text-xs text-blue-500 dark:text-blue-300 flex items-center gap-1">
                  <User className="h-4 w-4" /> Professeur
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {Object.values(profGroup.matieres).map(mg => (
                <div key={mg.matiere.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-semibold shadow">
                    <Award className="h-4 w-4" /> {mg.matiere.nom}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {mg.classes.map(c => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-medium shadow"
                      >
                        <Users className="h-3 w-3" /> {c.nom}
                      </span>
                    ))}
                  </span>
                  {mg.annee && (
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-semibold shadow">
                      <Calendar className="h-3 w-3" /> {mg.annee.libelle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  })()}
</CardContent>
  </Card>
</TabsContent>   




          {/* Onglet Années Scolaires */}
                    {/* Onglet Années Scolaires */}
          <TabsContent value="annees">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
        <Calendar className="h-6 w-6" />
        Année scolaire
      </CardTitle>
      <div className="text-sm text-blue-500 dark:text-blue-300 mt-1 mb-4">
        Retrouvez ici toutes les années académiques de votre établissement.
      </div>
      <div className="flex items-center mb-2">
        <Button
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition"
          onClick={() => setIsAddAnneeOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une année
        </Button>
      </div>
    </CardHeader>

    <CardContent>
      {annees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 select-none">
          <Calendar className="mb-5 w-12 h-12 text-gray-400" />
          <p className="text-lg italic font-light">Aucune année scolaire trouvée.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {annees.map((annee) => {
            const isOpen = openAnneeTrimestresId === annee.id;
            const trimestresAnnee = trimestres.filter(
              (t) => t.anneeScolaire?.id === parseInt(annee.id)
            );

            return (
              <li
                key={annee.id}
                className={`relative flex flex-col bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400 cursor-pointer ${
                  isOpen ? "ring-2 ring-blue-500" : ""
                }`}
                tabIndex={0}
                role="button"
                onClick={() =>
                  setOpenAnneeTrimestresId(isOpen ? null : annee.id)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenAnneeTrimestresId(isOpen ? null : annee.id);
                  }
                }}
                aria-label={`Année scolaire ${annee.libelle}`}
                aria-expanded={isOpen}
              >
                <header className="flex items-center gap-4 px-6 pt-6">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600 text-white text-2xl shadow-lg">
                      <Calendar className="w-8 h-8" />
                    </span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {annee.libelle}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                    onClick={(e) => {
                      e.stopPropagation(); // Empêche le déclenchement de l'ouverture/fermeture de la carte
                      setAnneeToDelete({ id: annee.id, libelle: annee.libelle });
                                          
                    }}
                  ><Trash2 className="h-5 w-5" /></Button>
                </header>

                <div className="flex items-center justify-between px-6 pb-6 gap-6 mt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1">
                      Début
                    </span>
                    <time
                      dateTime={annee.date_debut}
                      className="text-base font-medium text-gray-800 dark:text-gray-200"
                    >
                      {new Date(annee.date_debut).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>

                  <ArrowRightIcon className="h-7 w-7 text-blue-500 dark:text-blue-400" />

                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1">
                      Fin
                    </span>
                    <time
                      dateTime={annee.date_fin}
                      className="text-base font-medium text-gray-800 dark:text-gray-200"
                    >
                      {new Date(annee.date_fin).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>

                {/* Trimestres affichés en-dessous si ouverts */}
                {isOpen && (
                  <div className="px-6 pb-6 -mt-2 border-t border-blue-100 dark:border-blue-700">
                    <h4 className="text-md font-semibold text-blue-800 dark:text-blue-200 mt-4 mb-3">
                      Trimestres
                    </h4>
                    {trimestresAnnee.length === 0 ? (
                      <div className="text-sm italic text-gray-500 dark:text-gray-400">
                        Aucun trimestre défini pour cette année.
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {trimestresAnnee.map((trimestre) => (
                          <li key={trimestre.id} className="flex items-center gap-2">
                            <ArrowRightIcon className="h-4 w-4 text-green-600 dark:text-green-300" />
                            <span className="font-medium">{trimestre.nom}</span> : Du{" "}
                            {new Date(trimestre.date_debut).toLocaleDateString()} au{" "}
                            {new Date(trimestre.date_fin).toLocaleDateString()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
  </Card>
</TabsContent>



        </Tabs>
      </div>

      {/* Dialog Ajouter Classe */}
      <Dialog open={isAddClasseOpen} onOpenChange={setIsAddClasseOpen}>
  <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-2xl border-2 border-blue-300 bg-white p-0 shadow-2xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-lg">
    <DialogHeader className="p-6">
 
      <DialogTitle className="text-center text-2xl font-bold text-gray-800 dark:text-white">
        Nouvelle Classe
      </DialogTitle>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Remplissez les informations requises pour créer une nouvelle classe
      </p>
    </DialogHeader>

    <form
      onSubmit={async (e) => {
        e.preventDefault();

        // Création de la classe
        const res = await fetch(`${API_URL}/api/classes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nom: classeNom, niveau: classeNiveau,anneeScolaireId }),
        });

        const nouvelleClasse = await res.json();

        // Fonction de vérification du niveau
        const estCollegeOuLycee = (niveau: string) =>
          ["collège", "lycée"].includes(niveau.toLowerCase());

        let message = "Classe ajoutée avec succès !";

        if (estCollegeOuLycee(classeNiveau)) {
          const prefixe = classeNom.match(/^\d+/)?.[0];

          if (prefixe) {
            const classeExistante = classes.find(
      (c) => c.nom.startsWith(prefixe) && c.nom !== classeNom && c.annee_scolaire_id === anneeScolaireId
    );

            if (classeExistante) {
              await fetch(`${API_URL}/api/coefficientclasse/clone`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  fromClasseId: classeExistante.id,
                  toClasseId: nouvelleClasse.id,
                }),
              });

              message = "Classe ajoutée et coefficients copiés automatiquement.";
            }
          }
        }

        setClasses([...classes, nouvelleClasse]);
        setClasseNom("");
        setClasseNiveau("Primaire");
        setIsAddClasseOpen(false);
        
        toast.success(message);
      }}
      className="space-y-6 p-6"
    >
      <fieldset className="border border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-5 bg-gray-50 dark:bg-gray-800/50">
        <legend className="text-lg font-medium text-blue-700 dark:text-blue-300 px-2">
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Informations de la classe
          </span>
        </legend>

        {/* Nom de la classe */}
        <div className="space-y-3">
          <label htmlFor="classeNom" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Nom de la classe <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="classeNom"
              value={classeNom}
              onChange={(e) => setClasseNom(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white pl-11"
              placeholder="Ex: 3AS1, 4ème B, CP2..."
              required
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Sélection de l’année scolaire */}
<div className="space-y-3">
  <label htmlFor="anneeScolaire" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
    Année scolaire <span className="text-red-500">*</span>
  </label>
  <select
    id="anneeScolaire"
    value={anneeScolaireId}
    onChange={(e) => setAnneeScolaireId(e.target.value)}
    required
    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
  >
    <option value="">Sélectionner une année scolaire</option>
    {annees.map((annee) => (
      <option key={annee.id} value={annee.id}>
  {annee.libelle}
</option>

    ))}
  </select>
</div>

        {/* Boutons niveau */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Niveau scolaire <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {["Primaire", "Collège", "Lycée"].map((niveau) => (
              <button
                key={niveau}
                type="button"
                onClick={() => setClasseNiveau(niveau)}
                className={`px-4 py-3 rounded-xl font-medium border flex items-center justify-center gap-2 transition-all ${
                  classeNiveau === niveau
                    ? "bg-blue-600 text-white border-blue-600 shadow-md"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700"
                }`}
              >
                {niveau}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between items-center pt-2">
        <button
          type="button"
          onClick={() => setIsAddClasseOpen(false)}
          className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          Annuler
        </button>
        <Button
          type="submit"
          className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold shadow-md hover:shadow-lg flex items-center gap-2"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Créer la classe
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

      {/* Dialog Ajouter Coefficient */}
     <Dialog open={isAddCoeffOpen} onOpenChange={setIsAddCoeffOpen}>
  <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-lg border-2 border-blue-300 bg-white p-0 shadow-xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-2xl">
    <DialogHeader className="p-6">
      <div className="flex items-center justify-center mb-2">
        <DialogTitle className="text-center text-2xl font-bold text-blue-700 dark:text-blue-300">
          Gestion des Coefficients
        </DialogTitle>
      </div>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        Attribuez les coefficients par matière pour une classe
      </p>
    </DialogHeader>

    <form
      onSubmit={async (e) => {
        e.preventDefault();

        setCoeffError(""); // reset erreur avant validation

        if (!coeffClasse || Object.keys(coeffData).length === 0) {
  setCoeffError("Veuillez sélectionner une classe et au moins une matière avec son coefficient.");
  return;
}

  // Filter out entries with empty or invalid coefficients before creating the payload
        const payload = Object.entries(coeffData)
          .filter(([_, coefficient]) => coefficient !== '' && !isNaN(Number(coefficient)) && Number(coefficient) > 0)
          .map(([matiere_id, coefficient]) => ({
          classe_id: Number(coeffClasse),
          matiere_id: Number(matiere_id),
          coefficient: Number(coefficient),
        }));

          if (payload.length === 0) {
          setCoeffError("Veuillez renseigner au moins un coefficient valide.");
          return;
        }

        try {
          const response = await fetch(`${API_URL}/api/coefficientclasse`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error("Erreur lors de l'envoi des coefficients.");
          }

          await response.json();

          // Reset formulaire et affichage message succès
          setIsAddCoeffOpen(false);
          setCoeffClasse("");
          setCoeffData({});
          refreshCoefficients();
          setSuccessMsg("Coefficients enregistrés avec succès !");
          setTimeout(() => setSuccessMsg(""), 3000);
        } catch (error) {
          console.error(error);
          setCoeffError(error.message || "Erreur inconnue.");
        }
            }} className="space-y-6 p-6"

    >
      {/* Section Classe */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
          Sélection de la classe
        </h3>
        {!currentConfiguredAcademicYearId && (
          <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md text-xs">
            Aucune année scolaire actuelle n'est configurée dans les Paramètres généraux.
            La liste affiche donc toutes les classes. Pour filtrer, veuillez
            <button
              type="button"
              onClick={() => onNavigate('settings')} // Utilisation de la prop onNavigate
              className="underline font-semibold ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              configurer l'année actuelle
            </button>.          </div>
        )}
        <select
          value={coeffClasse}
          onChange={(e) => setCoeffClasse(e.target.value)}
          className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-700 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="">-- Choisir une classe --</option>
          {currentConfiguredAcademicYearId && classesForCoeffDialog.length === 0 ? (
            <option value="" disabled>Aucune classe pour l'année scolaire actuelle</option>
          ) : (
            classesForCoeffDialog.map((classe) => (
              <option key={classe.id} value={classe.id}>
                {classe.nom} ({annees.find(a => a.id === classe.annee_scolaire_id)?.libelle || 'Année inconnue'})
              </option>
            ))
          )}
        </select>
      </div>

      {/* Section Matières */}
      <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
          <ClipboardListIcon className="h-5 w-5 mr-2" />
          Attribution des coefficients
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Cliquez sur une matière pour l'ajouter, puis renseignez le coefficient
        </p>

        {coeffClasse && ( // Afficher les matières seulement si une classe est sélectionnée
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(() => {
              const existingCoeffsForSelectedClass = coefficients.filter(
                (c: any) => String(c.classe?.id) === String(coeffClasse)
              );
              const existingMatiereIdsForSelectedClass = existingCoeffsForSelectedClass.map(
                (c: any) => String(c.matiere.id)
              );
              
              const availableMatieresForAdding = matieres.filter(
                (m) => !existingMatiereIdsForSelectedClass.includes(String(m.id))
              );

           if (availableMatieresForAdding.length === 0 && coeffClasse) {
                return <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 p-4">Toutes les matières ont déjà un coefficient pour cette classe. Vous pouvez les modifier depuis l'onglet "Coefficients".</p>;
              }

              return availableMatieresForAdding.map((matiere) => {
                const isSelected = coeffData[matiere.id] !== undefined;
                return (
                  <div
                    key={matiere.id}
                    className={`border-2 p-3 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer
                      ${
                        isSelected
                          ? "border-blue-500 bg-blue-100 dark:bg-blue-800 shadow-md"
                          : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400"
                      }`}
                    onClick={() => {
                      if (isSelected) {
                        const updated = { ...coeffData };
                        delete updated[matiere.id];
                        setCoeffData(updated);
                      } else {
                        setCoeffData({ ...coeffData, [matiere.id]: 1 });
                      }
                    }}
                  >
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${isSelected ? 'bg-blue-600' : 'bg-gray-400'}`} />
                      <span className="font-medium text-gray-900 dark:text-gray-100">{matiere.nom}</span>
                    </div>
                    {isSelected && (
                      <div className="flex items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400 mr-2">Coeff:</span>
                        <input
                          type="number"
                          value={coeffData[matiere.id]}
                                                    onChange={(e) => {
                            const value = e.target.value;
                            // Allow empty string for clearing the input, otherwise parse as float
                            setCoeffData({ ...coeffData, [matiere.id]: value === '' ? '' : parseFloat(value) });
                          }}

                          className="w-16 border border-blue-300 dark:border-blue-700 rounded-md px-2 py-1 text-center text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          min="1" step="1"
                          onClick={(e) => e.stopPropagation()} // Important pour ne pas déclencher le onClick du div parent
                        />
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        )}
        {!coeffClasse && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">Veuillez d'abord sélectionner une classe.</p>
        )}
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button
          type="button"
          onClick={() => setIsAddCoeffOpen(false)}
          className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition flex items-center"
        >
          <SaveIcon className="h-5 w-5 mr-2" />
          Enregistrer
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>

{/* Dialog Modifier Coefficient */}
    <Dialog open={isEditCoeffDialogOpen} onOpenChange={setIsEditCoeffDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le Coefficient</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Classe: {currentEditingCoeff?.classeNom} <br />
            Matière: {currentEditingCoeff?.matiereNom}
          </p>
        </DialogHeader>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
if (!currentEditingCoeff || currentEditingCoeff.coefficient === '' || isNaN(Number(currentEditingCoeff.coefficient)) || Number(currentEditingCoeff.coefficient) <= 0) {
              toast.error("Le coefficient ne peut pas être vide et doit être un nombre positif.");
              return;
            }            try {
              const response = await fetch(`${API_URL}/api/coefficientclasse/${currentEditingCoeff.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ coefficient: Number(currentEditingCoeff.coefficient) }),
              });
              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "Erreur lors de la mise à jour.");
              }
              toast.success("Coefficient mis à jour !");
              refreshCoefficients(); // Assurez-vous que cette fonction est définie et recharge les coefficients
              setIsEditCoeffDialogOpen(false);
              setCurrentEditingCoeff(null);
            } catch (error: any) {
              toast.error(error.message || "Une erreur est survenue.");
            }
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="editCoefficientValue" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Nouveau Coefficient
            </label>
            <Input
              id="editCoefficientValue"
              type="number"
             value={currentEditingCoeff?.coefficient ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                setCurrentEditingCoeff(prev => prev ? { ...prev, coefficient: value === '' ? '' : parseFloat(value) } : null)
              }}
              className="mt-1 block w-full"
             min="1"
              step="1"
              required
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsEditCoeffDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>




      {/* Dialog Affecter Professeur */}
      <Dialog open={isAffectProfOpen} onOpenChange={setIsAffectProfOpen}>
  <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-lg border-2 border-blue-300 bg-white p-0 shadow-xl dark:border-blue-800 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-md">
    <DialogHeader className="p-6">

      <DialogTitle className="text-xl font-semibold text-blue-700 dark:text-blue-300 text-center">
        Affectation Professeur
      </DialogTitle>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        Attribuer un professeur à une matière et une ou plusieurs classes
      </p>
    </DialogHeader>

    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!affectProf || !affectMatiere || affectClasses.length === 0 || !affectAnnee) {
          toast.error("Veuillez compléter tous les champs requis");
          return;
        }

        const affectationPromises = affectClasses.map(classeId => {
          return fetch(`${API_URL}/api/affectations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              professeur_id: affectProf,
              matiere_id: affectMatiere,
              classe_id: classeId,
              annee_id: affectAnnee,
            }),
          }).then(res => res.json());
        });

        Promise.all(affectationPromises)
          .then(newAffectations => {
            setAffectations([...affectations, ...newAffectations]);
            setAffectProf("");
            setAffectMatiere("");
            setAffectClasses([]);
            setAffectAnnee("");
            setIsAffectProfOpen(false);
            toast.success("Affectation(s) enregistrée(s) avec succès !");
          })
          .catch(error => {
            console.error("Erreur:", error);
            toast.error("Erreur lors de l'affectation");
          });
      }}
      className="space-y-4 p-6"
    >
      {/* Professeur */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Professeur <span className="text-red-500">*</span>
        </label>
        <select
          value={affectProf}
          onChange={(e) => setAffectProf(e.target.value)}
          className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          required
        >
          <option value="">Sélectionner un professeur</option>
          {profs.map(prof => (
            <option key={prof.id} value={prof.id}>
              {prof.nom} {prof.prenom}
            </option>
          ))}
        </select>
      </div>

      {/* Matière */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Matière <span className="text-red-500">*</span>
        </label>
        <select
          value={affectMatiere}
          onChange={(e) => setAffectMatiere(e.target.value)}
          className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
          required
        >
          <option value="">Sélectionner une matière</option>
          {matieres.map(matiere => (
            <option key={matiere.id} value={matiere.id}>
              {matiere.nom}
            </option>
          ))}
        </select>
      </div>

      {/* Année scolaire */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Année Scolaire <span className="text-red-500">*</span>
  </label>
  <select
    value={affectAnnee}
    onChange={(e) => {
      setAffectAnnee(e.target.value);
      // Réinitialiser la sélection de classes quand l'année change
      setAffectClasses([]);
    }}
    className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
    required
  >
    <option value="">Sélectionner une année</option>
    {annees.map(annee => (
      <option key={annee.id} value={annee.id}>
        {annee.libelle}
      </option>
    ))}
  </select>
</div>

{/* Classes - filtrées par année scolaire */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
    Classes <span className="text-red-500">*</span>
  </label>
  <div className="border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 p-2 max-h-48 overflow-y-auto shadow-inner">
    {(affectAnnee
      ? classes.filter(classe => classe.annee_scolaire_id.toString() === affectAnnee)
      : []
    ).map(classe => (
      <div 
        key={classe.id}
        className={`flex items-center p-2 rounded-md mb-1 cursor-pointer transition-colors duration-150 ${
          affectClasses.includes(classe.id) 
            ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
        }`}
        onClick={() => {
          if (affectClasses.includes(classe.id)) {
            setAffectClasses(affectClasses.filter(id => id !== classe.id));
          } else {
            setAffectClasses([...affectClasses, classe.id]);
          }
        }}
      >
        <div className={`flex items-center justify-center h-5 w-5 rounded border ${
          affectClasses.includes(classe.id)
            ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
            : 'border-gray-300 dark:border-gray-500'
        }`}>
          {affectClasses.includes(classe.id) && (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
        <span className="ml-3 text-gray-900 dark:text-gray-100">
          {classe.nom}
        </span>
      </div>
    ))}
  </div>
  {affectClasses.length > 0 ? (
    <p className="text-xs text-blue-600 dark:text-blue-400">
      {affectClasses.length} classe(s) sélectionnée(s)
    </p>
  ) : (
    <p className="text-xs text-gray-500 dark:text-gray-400">
      {affectAnnee ? "Aucune classe sélectionnée" : "Veuillez sélectionner une année"}
    </p>
  )}
</div>

      {/* Boutons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          onClick={() => setIsAffectProfOpen(false)}
          className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center gap-1"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Valider l'affectation
        </Button>
      </div>
    </form>
  </DialogContent>
</Dialog>


       {/* Dialog Ajouter Année Scolaire */}
      {/* === FORMULAIRE MULTI-ÉTAPES === */}
<Dialog open={isAddAnneeOpen || isAddTrimestreOpen} onOpenChange={open => {
  setIsAddAnneeOpen(open);
  setIsAddTrimestreOpen(false); // reset to step 1 if closed
}}>
  <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-2xl border-2 border-blue-300 bg-white p-0 shadow-2xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-xl">
    <DialogHeader className="p-6">
      <DialogTitle className="text-center text-xl text-blue-700 dark:text-blue-200">
        {isAddAnneeOpen ? "Étape 1 : Ajouter une année scolaire" : "Étape 2 : Ajouter les 3 trimestres"}
      </DialogTitle>
    </DialogHeader>

    {/* === BARRE DE PROGRESSION === */}
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${isAddAnneeOpen ? 'bg-blue-600' : 'bg-green-500'}`}>1</div>
        <span className={`${isAddAnneeOpen ? 'text-blue-600' : 'text-gray-400'}`}>Année scolaire</span>
      </div>
      <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-2" />
      <div className="flex items-center space-x-2">
        <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${isAddTrimestreOpen ? 'bg-blue-600' : 'bg-gray-400'}`}>2</div>
        <span className={`${isAddTrimestreOpen ? 'text-blue-600' : 'text-gray-400'}`}>Trimestres</span>
      </div>
    </div>

    {/* === ETAPE 1 === */}
    {isAddAnneeOpen && (
  <form
    onSubmit={async e => {
      e.preventDefault();
    // Ouvrir le dialogue de confirmation au lieu d'envoyer directement
      setAnneeToConfirm({ libelle: anneeLibelle, debut: anneeDebut, fin: anneeFin });
      setIsConfirmAnneeOpen(true);  
     }} className="space-y-6 p-6"

  >
    <fieldset className="border border-blue-200 dark:border-blue-800 rounded-xl p-6">
      <legend className="text-lg font-semibold text-blue-700 dark:text-blue-300 px-2">
        Informations sur l'année scolaire
      </legend>

      <div className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Libellé de l'année scolaire
          </label>
          <input
            type="text"
            placeholder="ex : 2024-2025"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            value={anneeLibelle}
            onChange={e => setAnneeLibelle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Date de début
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            value={anneeDebut}
            onChange={e => setAnneeDebut(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Date de fin
          </label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
            value={anneeFin}
            onChange={e => setAnneeFin(e.target.value)}
            required
          />
        </div>
      </div>
    </fieldset>

    <Button type="submit" className="btn-primary w-full text-white font-bold py-2">
      Continuer vers les trimestres
    </Button>
  </form>
)}


    {/* === ETAPE 2 === */}
    {isAddTrimestreOpen && (
  <form
    onSubmit={async e => {
      e.preventDefault();
      const allTrimestres = [
                { nom: "Trimestre 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin, annee_scolaire_id: anneeScolaireId },
        { nom: "Trimestre 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin, annee_scolaire_id: anneeScolaireId },
        { nom: "Trimestre 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin, annee_scolaire_id: anneeScolaireId }
      ];


      setTrimestresToConfirm(allTrimestres.map(t => ({ nom: t.nom, date_debut: t.date_debut, date_fin: t.date_fin }))); // Ne stockez que ce qui est nécessaire pour l'affichage de confirmation
      setIsConfirmTrimestresOpen(true);
        }} className="space-y-6 p-6"

  >
    {[1, 2, 3].map(i => (
      <fieldset
        key={i}
        className="border border-blue-200 dark:border-blue-800 rounded-xl p-4"
      >
        <legend className="text-lg font-semibold text-blue-700 dark:text-blue-300 px-2">
          Trimestre {i}
        </legend>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Date de début
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              value={eval(`trimestre${i}Debut`)}
              onChange={e => eval(`setTrimestre${i}Debut(e.target.value)`)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Date de fin
            </label>
            <input
              type="date"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
              value={eval(`trimestre${i}Fin`)}
              onChange={e => eval(`setTrimestre${i}Fin(e.target.value)`)}
              required
            />
          </div>
        </div>
      </fieldset>
    ))}

    <Button type="submit" className="btn-primary w-full text-white font-bold py-2">
      Enregistrer les trimestres
    </Button>
  </form>
)}

  </DialogContent>
</Dialog>
 
 {/* Dialogue de Confirmation pour l'Année Scolaire */}
 <Dialog open={isDeleteAnneeDialogOpen} onOpenChange={(isOpen) => {
  setIsDeleteAnneeDialogOpen(isOpen);
  if (!isOpen) setAnneeToDelete(null);
}}>
  <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl animate-fade-in-up bg-red-50 dark:bg-red-900">
    <DialogHeader className="bg-gradient-to-r from-red-600 to-red-400 text-white p-6 pb-4">
      <DialogTitle className="text-2xl font-extrabold tracking-tight">
        Supprimer l'année scolaire
      </DialogTitle>
    </DialogHeader>
    <div className="p-6 space-y-4 text-gray-800 dark:text-gray-200">
      <p className="text-lg font-semibold text-red-700 dark:text-red-200">
        Êtes-vous sûr de vouloir supprimer l'année scolaire&nbsp;
        <span className="font-bold">{anneeToDelete?.libelle}</span> ?
      </p>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Cette action est <span className="font-bold text-red-700 dark:text-red-300">irréversible</span> et supprimera toutes les données associées à cette année (trimestres, classes, coefficients, affectations...).
      </p>
    </div>
    <DialogFooter className="flex justify-end gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t">
      <Button variant="outline" onClick={() => setIsDeleteAnneeDialogOpen(false)} className="px-5 py-2.5 text-base rounded-md">
        Annuler
      </Button>
      <Button
        onClick={handleDeleteAnnee}
        className="px-5 py-2.5 text-base rounded-md bg-red-600 hover:bg-red-700 text-white font-bold"
      >
        Supprimer définitivement
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<Dialog open={isConfirmAnneeOpen} onOpenChange={setIsConfirmAnneeOpen}>
  <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl animate-fade-in-up bg-blue-50 dark:bg-blue-900">
    <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 pb-4">
      <DialogTitle className="text-2xl font-extrabold tracking-tight">Confirmer l'Année Scolaire</DialogTitle>
    </DialogHeader>
    {anneeToConfirm && (
      <div className="p-6 space-y-4 text-gray-800 dark:text-gray-200">
        {/* ...infos année... */}
      </div>
    )}
    <DialogFooter className="flex justify-end gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t">
      <Button variant="outline" onClick={() => setIsConfirmAnneeOpen(false)} className="px-5 py-2.5 text-base rounded-md">
        Annuler
      </Button>
      <Button
        onClick={handleConfirmSaveAnnee}
        className="px-5 py-2.5 text-base rounded-md bg-red-600 hover:bg-red-700 text-white font-bold"
      >
        Confirmer et Continuer
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>


<Dialog open={isConfirmTrimestresOpen} onOpenChange={setIsConfirmTrimestresOpen}>
  <DialogContent className="max-w-lg">
    <DialogHeader>
      <DialogTitle className="text-lg font-semibold">Confirmer les Informations des Trimestres</DialogTitle>
      <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
        Vérifiez attentivement les détails de chaque trimestre avant d'enregistrer.
      </DialogDescription>
    </DialogHeader>
    {trimestresToConfirm.length > 0 && (
      <div className="space-y-4 py-4 max-h-96 overflow-y-auto pr-2"> {/* Added pr-2 for scrollbar spacing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Increased gap for better separation */}
          {trimestresToConfirm.map((trim, index) => (
            <div
              key={index}
              className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200" // Rounded corners, shadow, hover effect
            >
              <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2 text-md">{trim.nom}</h3> {/* Slightly larger name */}
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="font-medium">Début:</strong> {trim.date_debut}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                <strong className="font-medium">Fin:</strong> {trim.date_fin}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md border border-orange-200 dark:border-orange-800">
          <span className="font-semibold">Attention:</span> Assurez-vous que les dates sont correctes pour chaque période.
        </p>
      </div>
    )}
    <DialogFooter className="flex justify-end gap-3 pt-4">
      <Button variant="outline" onClick={() => setIsConfirmTrimestresOpen(false)} className="px-4 py-2">Annuler</Button>
      <Button onClick={handleConfirmSaveTrimestres} className="px-4 py-2">Confirmer et Enregistrer</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
      {/* Assurez-vous d'avoir Toaster pour afficher les notifications */}
      <Toaster richColors position="top-right" />

    </div>
  );

}
