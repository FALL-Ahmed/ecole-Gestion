import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Users, Award, Calendar, User, ArrowRightIcon } from "lucide-react";

export default function SchoolManagement() {
  const [activeTab, setActiveTab] = useState("classes");
  const [isAddClasseOpen, setIsAddClasseOpen] = useState(false);
  const [isAddCoeffOpen, setIsAddCoeffOpen] = useState(false);
  const [isAffectProfOpen, setIsAffectProfOpen] = useState(false);
  const [isAddAnneeOpen, setIsAddAnneeOpen] = useState(false);
  const [affectations, setAffectations] = useState([]);
  const [filterProf, setFilterProf] = useState("");
  const [filterClasse, setFilterClasse] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
  const [coefficients, setCoefficients] = useState([]);
  const [coeffError, setCoeffError] = useState("");
  const [openAnnee, setOpenAnnee] = useState<string | null>(null);
  const [loadingTrimestres, setLoadingTrimestres] = useState(false);
  
  // States pour les formulaires
  const [classeNom, setClasseNom] = useState("");
  const [classeNiveau, setClasseNiveau] = useState("Primaire");
  const [coeffClasse, setCoeffClasse] = useState("");
  const [selectedMatieres, setSelectedMatieres] = useState<{ [id: string]: number }>({});

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
const [anneeScolaireId, setAnneeScolaireId] = useState(null);


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

// Feedback
const [successMsg, setSuccessMsg] = useState("");

  // Données récupérées depuis l'API
  const [classes, setClasses] = useState<{ id: string, nom: string }[]>([]);
  const [matieres, setMatieres] = useState<{ id: string, nom: string }[]>([]);
  const [annees, setAnnees] = useState<{
    date_fin: string;
    date_debut: string; id: string, libelle: string
}[]>([]);
  const [profs, setProfs] = useState<{ id: string, nom: string, prenom: string }[]>([]);

// Définir refreshCoefficients ici pour qu'il soit accessible partout dans le composant
const refreshCoefficients = () => {
  fetch("http://localhost:3000/api/coefficientclasse")
    .then(res => res.json())
    .then(data => setCoefficients(data));
};

useEffect(() => {
  fetch("http://localhost:3000/api/classes")
    .then(res => res.json())
    .then(data => setClasses(data));
  fetch("http://localhost:3000/api/matieres")
    .then(res => res.json())
    .then(data => setMatieres(data));
  fetch("http://localhost:3000/api/annees-academiques")
    .then(res => res.json())
    .then(data => setAnnees(data));
  fetch("http://localhost:3000/api/users")
    .then(res => res.json())
    .then(data => setProfs(data.filter((u: any) => u.role === "professeur")));
  fetch("http://localhost:3000/api/trimestres")
      .then(res => res.json())
      .then(data => setTrimestres(data))
      .catch(error => console.error("Error fetching trimestres:", error)); // Ajout d'une gestion d'erreur simple
  // AJOUTE CETTE LIGNE :
  fetch("http://localhost:3000/api/affectations")
    .then(res => res.json())
    .then(data => setAffectations(data));
  refreshCoefficients(); // Charger les coefficients au montage
}, []);

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
          <TabsList className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border border-blue-100 dark:border-gray-700 rounded-2xl shadow flex w-full gap-3 p-2">
            <TabsTrigger
              value="classes"
              className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Users className="h-5 w-5" /> Classes
            </TabsTrigger>
            <TabsTrigger
              value="coefficients"
              className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Award className="h-5 w-5" /> Coefficients
            </TabsTrigger>
            <TabsTrigger
              value="affectations"
              className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <User className="h-5 w-5" /> Professeurs
            </TabsTrigger>
            <TabsTrigger
              value="annees"
              className="flex-1 flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition
                text-blue-800 dark:text-blue-100
                hover:bg-blue-100 dark:hover:bg-gray-800
                data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Calendar className="h-5 w-5" /> Années
            </TabsTrigger>
          </TabsList>

          {/* Onglet Classes */}
          <TabsContent value="classes">
            <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
                  <Users className="h-6 w-6" /> Gestion des classes
                </CardTitle>
              </CardHeader>
              <CardContent>
  <div className="flex justify-between items-center mb-6">
    <Button
      className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition"
      onClick={() => setIsAddClasseOpen(true)}
    >
      <Plus className="h-4 w-4 mr-2" />
      Ajouter une classe
    </Button>
    {successMsg && (
      <div className="ml-4 px-4 py-2 rounded bg-green-100 text-green-800 text-sm font-semibold shadow">
        {successMsg}
      </div>
    )}
  </div>
  <div>
    {classes.length === 0 ? (
      <div className="text-gray-500 italic">Aucune classe trouvée.</div>
    ) : (
      Object.entries(groupClassesByNiveauAndAnnee(classes)).map(([niveau, annees]) => (
        <div key={niveau} className="mb-10">
          <h3 className="text-xl font-bold text-blue-700 mb-4 capitalize flex items-center gap-2">
            <Users className="h-6 w-6" /> {niveau}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {sortAnnees(annees).map(annee => (
              <div
  key={annee}
  className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow p-4 mb-2
    transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
  style={{ animation: "fadeIn 0.6s" }}
>
  <div className="flex items-center gap-2 mb-3">
    <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
    <span className="text-base font-semibold text-indigo-700 dark:text-indigo-200">{annee}</span>
  </div>
  <ul className="flex flex-wrap gap-3">
    {annees[annee].map(classe => (
      <li
        key={classe.id}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow-sm font-semibold text-blue-900 dark:text-blue-100 text-base
          transition-all duration-300 ease-out hover:bg-blue-100 dark:hover:bg-blue-900 hover:scale-105"
        style={{ animation: "fadeIn 0.7s" }}
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
      ))
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
                  const firstClasse = groupClassesByNiveauAndAnnee(classes)[niveau]?.[annee]?.[0];
                  if (!firstClasse) return <span className="text-xs text-gray-400 italic">Aucune matière</span>;
                  const coefs = coefficients.filter(c => c.classe?.id == firstClasse.id);
                  if (coefs.length === 0) return <span className="text-xs text-gray-400 italic">Aucun coefficient</span>;
                  return coefs.map(c => (
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
    <CardHeader className="flex flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
        <User className="h-6 w-6" /> Affectation des professeurs
      </CardTitle>
      {/* Filtres en haut à droite */}
      <div className="flex gap-2 items-center">
        <select
          className="border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300"
          value={filterProf}
          onChange={e => setFilterProf(e.target.value)}
        >
          <option value="">Tous les professeurs</option>
          {profs.map(prof => (
            <option key={prof.id} value={prof.id}>
              {prof.nom} {prof.prenom}
            </option>
          ))}
        </select>
        <select
          className="border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300"
          value={filterClasse}
          onChange={e => setFilterClasse(e.target.value)}
        >
          <option value="">Toutes les classes</option>
          {classes.map(classe => (
            <option key={classe.id} value={classe.id}>
              {classe.nom}
            </option>
          ))}
        </select>
        <select
  className="border border-blue-300 dark:border-blue-700 rounded-lg px-3 py-1 text-sm bg-white dark:bg-gray-800 shadow-sm focus:ring-2 focus:ring-blue-300"
  value={filterAnnee}
  onChange={e => setFilterAnnee(e.target.value)}
>
  <option value="">Toutes les années</option>
  {annees.map(annee => (
    <option key={annee.id} value={annee.id}>
      {annee.libelle}
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
    function groupAffectationsByProf(affectations) {
      const grouped = {};
      affectations.forEach(aff => {
        const profId = aff.professeur?.id;
        if (!profId) return;
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
      <div className="italic text-gray-500 text-center py-8">Aucune affectation trouvée.</div>
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
                  <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600 text-white text-2xl shadow-lg">
                    <Calendar className="w-8 h-8" />
                  </span>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
                    {annee.libelle}
                  </h3>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
          </DialogHeader>
          {/* Formulaire d'ajout de classe */}
          <form onSubmit={(e) => {
            e.preventDefault();
            fetch("http://localhost:3000/api/classes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nom: classeNom, niveau: classeNiveau }),
            })
              .then(res => res.json())
              .then(newClasse => {
                setClasses([...classes, newClasse]);
                setClasseNom("");
                setClasseNiveau("Primaire");
                setIsAddClasseOpen(false);
                setSuccessMsg("Classe ajoutée avec succès !");
                setTimeout(() => setSuccessMsg(""), 3000); // Masquer après 3 secondes
              });
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="classeNom" className="text-right">
                  Nom de la classe
                </label>
                <input
                  id="classeNom"
                  value={classeNom}
                  onChange={(e) => setClasseNom(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="classeNiveau" className="text-right">
                  Niveau
                </label>
                <select
                  id="classeNiveau"
                  value={classeNiveau}
                  onChange={(e) => setClasseNiveau(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
                  required
                >
                  <option value="Primaire">Primaire</option>
                  <option value="Collège">Collège</option>
                  <option value="Lycée">Lycée</option>
                  <option value="Supérieur">Supérieur</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Ajouter Coefficient */}
      <Dialog open={isAddCoeffOpen} onOpenChange={setIsAddCoeffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un coefficient</DialogTitle>
          </DialogHeader>
          {/* Formulaire d'ajout de coefficient */}
          <form onSubmit={(e) => {
            e.preventDefault();
            // Validation simple
            if (!coeffClasse || !coeffMatiere || coefficient <= 0) {
              setCoeffError("Veuillez sélectionner une classe, une matière et un coefficient valide.");
              return;
            }
            setCoeffError(""); // Réinitialiser l'erreur

            fetch("http://localhost:3000/api/coefficientclasse", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                classeId: coeffClasse,
                matiereId: coeffMatiere,
                coefficient: parseInt(coefficient as any), // Convertir en nombre
              }),
            })
              .then(res => {
                if (!res.ok) {
                  // Gérer les erreurs de l'API
                  return res.json().then(err => { throw new Error(err.message || 'Erreur lors de l\'ajout du coefficient'); });
                }
                return res.json();
              })
              .then(newCoeff => {
                // Mettre à jour l'état des coefficients
                setCoefficients([...coefficients, newCoeff]);
                setCoeffClasse("");
                setCoeffMatiere("");
                setCoefficient(1);
                setIsAddCoeffOpen(false);
                setSuccessMsg("Coefficient ajouté avec succès !");
                setTimeout(() => setSuccessMsg(""), 3000); // Masquer après 3 secondes
                refreshCoefficients(); // Rafraîchir la liste complète
              })
              .catch(error => {
                console.error("Erreur:", error);
                setCoeffError(error.message || "Une erreur est survenue lors de l'ajout.");
              });
          }}>
            <div className="grid gap-4 py-4">
              {coeffError && <div className="text-red-500 text-sm">{coeffError}</div>}
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="coeffClasse" className="text-right">
                  Classe
                </label>
                <select
                  id="coeffClasse"
                  value={coeffClasse}
                  onChange={(e) => setCoeffClasse(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
                  required
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="coeffMatiere" className="text-right">
                  Matière
                </label>
                <select
                  id="coeffMatiere"
                  value={coeffMatiere}
                  onChange={(e) => setCoeffMatiere(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
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
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="coefficient" className="text-right">
                  Coefficient
                </label>
                <input
                  id="coefficient"
                  type="number"
                  value={coefficient}
                  onChange={(e) => setCoefficient(parseInt(e.target.value))}
                  className="col-span-3 border rounded px-2 py-1"
                  min="1"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Ajouter</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Affecter Professeur */}
      <Dialog open={isAffectProfOpen} onOpenChange={setIsAffectProfOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Affecter un professeur à une matière et une classe</DialogTitle>
          </DialogHeader>
          {/* Formulaire d'affectation */}
          <form onSubmit={(e) => {
            e.preventDefault();
            // Validation simple
            if (!affectProf || !affectMatiere || affectClasses.length === 0 || !affectAnnee) {
              alert("Veuillez sélectionner un professeur, une matière, au moins une classe et une année scolaire.");
              return;
            }

            // Créer une affectation pour chaque classe sélectionnée
            const affectationPromises = affectClasses.map(classeId => {
              return fetch("http://localhost:3000/api/affectations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  professeurId: affectProf,
                  matiereId: affectMatiere,
                  classeId: classeId,
                  anneeScolaireId: affectAnnee,
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
                setSuccessMsg("Affectation(s) ajoutée(s) avec succès !");
                setTimeout(() => setSuccessMsg(""), 3000); // Masquer après 3 secondes
              })
              .catch(error => {
                console.error("Erreur:", error);
                alert("Une erreur est survenue lors de l'affectation.");
              });
          }}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="affectProf" className="text-right">
                  Professeur
                </label>
                <select
                  id="affectProf"
                  value={affectProf}
                  onChange={(e) => setAffectProf(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
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
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="affectMatiere" className="text-right">
                  Matière
                </label>
                <select
                  id="affectMatiere"
                  value={affectMatiere}
                  onChange={(e) => setAffectMatiere(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
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
              <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="affectClasses" className="text-right">
                  Classes (Ctrl+clic pour multiple)
                </label>
                <select
                  id="affectClasses"
                  multiple
                  value={affectClasses}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions);
                    setAffectClasses(options.map(option => option.value));
                  }}
                  className="col-span-3 border rounded px-2 py-1 h-24"
                  required
                >
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nom}
                    </option>
                  ))}
                </select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <label htmlFor="affectAnnee" className="text-right">
                  Année Scolaire
                </label>
                <select
                  id="affectAnnee"
                  value={affectAnnee}
                  onChange={(e) => setAffectAnnee(e.target.value)}
                  className="col-span-3 border rounded px-2 py-1"
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
            </div>
            <div className="flex justify-end">
              <Button type="submit">Affecter</Button>
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
  <DialogContent className="rounded-2xl shadow-2xl border-2 border-blue-300 dark:border-blue-900 w-full max-w-xl">
    <DialogHeader>
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
      const response = await fetch("http://localhost:3000/api/annees-academiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: anneeLibelle, date_debut: anneeDebut, date_fin: anneeFin })
      });

      if (response.ok) {
        const newAnnee = await response.json();
        setAnnees(prev => [...prev, newAnnee]);
        setAnneeScolaireId(newAnnee.id);
        setIsAddAnneeOpen(false);
        setSuccessMsg("Année ajoutée avec succès !");
        setTimeout(() => setSuccessMsg(""), 3000);
        setIsAddTrimestreOpen(true);
      } else {
        alert("Erreur lors de l'ajout de l'année.");
      }
    }}
    className="space-y-6"
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
        { nom: "Trimestre 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin },
        { nom: "Trimestre 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin },
        { nom: "Trimestre 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin }
      ];

      for (const trimestre of allTrimestres) {
        await fetch("http://localhost:3000/api/trimestres", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...trimestre, annee_scolaire_id: anneeScolaireId })
        });
      }

      setIsAddTrimestreOpen(false);
      setSuccessMsg("Trimestres ajoutés avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    }}
    className="space-y-6"
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


    </div>
  );
}

