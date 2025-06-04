// Fichier généré automatiquement - index.tsx
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Award, User, Calendar } from "lucide-react";

import { ClassesTab, CoefficientsTab, ProfessorsTab, AcademicYearsTab, AddClassDialog, AddCoefficientDialog, AssignProfessorDialog, AddAcademicYearDialog } from ".";


import {
  Classe,
  Matiere,
  AnneeScolaire,
  Professeur,
  Coefficient,
  Affectation,
  Trimestre,
} from "./components/school-management/types";
export { AcademicYearsTab } from './AcademicYearsTab';
export { AddAcademicYearDialog } from './AddAcademicYearDialog';
export { AddClassDialog } from './AddClassDialog';
export { AddCoefficientDialog } from './AddCoefficientDialog';
export { AssignProfessorDialog } from './AssignProfessorDialog';
export { ClassesTab } from './ClassesTab';
export { CoefficientsTab } from './CoefficientsTab';
export { ProfessorsTab } from './ProfessorsTab';

export default function SchoolManagement() {
  // États pour les données
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
  const [profs, setProfs] = useState<Professeur[]>([]);
  const [coefficients, setCoefficients] = useState<Coefficient[]>([]);
  const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [openAnnee, setOpenAnnee] = React.useState<string | null>(null);
 

  // États pour les onglets et filtres
  const [activeTab, setActiveTab] = useState<string>("classes");
  const [filterProf, setFilterProf] = useState<string>("");
  const [filterClasse, setFilterClasse] = useState<string>("");
  const [filterAnnee, setFilterAnnee] = useState<string>("");
  

  // États pour les dialogues
  const [isAddClasseOpen, setIsAddClasseOpen] = useState<boolean>(false);
  const [isAddCoeffOpen, setIsAddCoeffOpen] = useState<boolean>(false);
  const [isAffectProfOpen, setIsAffectProfOpen] = useState<boolean>(false);
  const [isAddAnneeOpen, setIsAddAnneeOpen] = useState<boolean>(false);
  const [isAddTrimestreOpen, setIsAddTrimestreOpen] = useState<boolean>(false);

  // États pour les messages
  const [successMsg, setSuccessMsg] = useState<string>("");
  const [coeffError, setCoeffError] = useState<string>("");

  // Chargement initial des données
  useEffect(() => {
    const fetchData = async () => {
      try {
        const responses = await Promise.all([
          fetch("http://localhost:3000/api/classes"),
          fetch("http://localhost:3000/api/matieres"),
          fetch("http://localhost:3000/api/annees-academiques"),
          fetch("http://localhost:3000/api/users"),
          fetch("http://localhost:3000/api/trimestres"),
          fetch("http://localhost:3000/api/affectations"),
          fetch("http://localhost:3000/api/coefficientclasse"),
        ]);

        const data = await Promise.all(responses.map((res) => res.json()));

        setClasses(data[0]);
        setMatieres(data[1]);
        setAnnees(data[2]);
        setProfs(data[3].filter((u: any) => u.role === "professeur"));
        setTrimestres(data[4]);
        setAffectations(data[5]);
        setCoefficients(data[6]);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  // Fonctions pour gérer les actions
  const handleAddClass = async (nom: string, niveau: string) => {
    try {
      const response = await fetch("http://localhost:3000/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, niveau }),
      });
      const newClasse = await response.json();
      setClasses((prev) => [...prev, newClasse]);
      setSuccessMsg("Classe ajoutée avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Erreur lors de l'ajout de la classe :", error);
    }
  };

  const handleAddCoefficient = async (
    classeId: string,
    matiereId: string,
    coefficient: number
  ) => {
    try {
      const response = await fetch("http://localhost:3000/api/coefficientclasse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classeId, matiereId, coefficient }),
      });
      const newCoeff = await response.json();
      setCoefficients((prev) => [...prev, newCoeff]);
      setSuccessMsg("Coefficient ajouté avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Erreur lors de l'ajout du coefficient :", error);
    }
  };

  const handleAssignProfessor = async (
    profId: string,
    matiereId: string,
    classesIds: string[],
    anneeId: string
  ) => {
    try {
      const responses = await Promise.all(
        classesIds.map((classeId) =>
          fetch("http://localhost:3000/api/affectations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              professeurId: profId,
              matiereId,
              classeId,
              anneeScolaireId: anneeId,
            }),
          }).then((res) => res.json())
        )
      );
      setAffectations((prev) => [...prev, ...responses]);
      setSuccessMsg("Affectation(s) ajoutée(s) avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Erreur lors de l'affectation :", error);
    }
  };

  const handleAddAnnee = async (
    libelle: string,
    dateDebut: string,
    dateFin: string
  ): Promise<string | undefined> => {
    try {
      const response = await fetch("http://localhost:3000/api/annees-academiques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle, date_debut: dateDebut, date_fin: dateFin }),
      });
      const newAnnee = await response.json();
      setAnnees((prev) => [...prev, newAnnee]);
      setSuccessMsg("Année ajoutée avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
      return newAnnee.id;
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'année :", error);
      return undefined;
    }
  };

  const handleAddTrimestres = async (
    anneeId: string,
    newTrimestres: { nom: string; date_debut: string; date_fin: string }[]
  ) => {
    try {
      const responses = await Promise.all(
        newTrimestres.map((trimestre) =>
          fetch("http://localhost:3000/api/trimestres", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...trimestre, annee_scolaire_id: anneeId }),
          }).then((res) => res.json())
        )
      );
      setTrimestres((prev) => [...prev, ...responses]);
      setSuccessMsg("Trimestres ajoutés avec succès !");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (error) {
      console.error("Erreur lors de l'ajout des trimestres :", error);
    }
  };

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
              <Calendar className="h-5 w-5" /> Années scolaires
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <ClassesTab
              classes={classes}
              matieres={matieres}
              onAddClass={() => setIsAddClasseOpen(true)}
              filterClasse={filterClasse}
              setFilterClasse={setFilterClasse}
            />
          </TabsContent>

          <TabsContent value="coefficients">
            <CoefficientsTab
              coefficients={coefficients}
              matieres={matieres}
              classes={classes}
              onAddCoefficient={() => setIsAddCoeffOpen(true)}
              filterClasse={filterClasse}
              setIsAddCoeffOpen={setIsAddCoeffOpen}
              setFilterClasse={setFilterClasse}
              coeffError={coeffError}
              setCoeffError={setCoeffError}
              setOpenAnnee={setOpenAnnee}
            />
          </TabsContent>

          <TabsContent value="affectations">
            <ProfessorsTab
              profs={profs}
              matieres={matieres}
              classes={classes}
              annees={annees}
              affectations={affectations}
              filterProf={filterProf}
              setFilterProf={setFilterProf}
              filterClasse={filterClasse}
              setFilterClasse={setFilterClasse}
              filterAnnee={filterAnnee}
              setFilterAnnee={setFilterAnnee}
              onAssignProfessor={() => setIsAffectProfOpen(true)}
            />
          </TabsContent>

          <TabsContent value="annees">
            <AcademicYearsTab
              annees={annees}
              trimestres={trimestres}
              openAnnee={openAnnee}
              setOpenAnnee={setOpenAnnee}
              onAddAnnee={() => setIsAddAnneeOpen(true)}
              onAddTrimestre={() => setIsAddTrimestreOpen(true)}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogues */}
        <AddClassDialog
          open={isAddClasseOpen}
          onClose={() => setIsAddClasseOpen(false)}
          onAdd={handleAddClass}
        />

        <AddCoefficientDialog
          open={isAddCoeffOpen}
          onClose={() => setIsAddCoeffOpen(false)}
          onAdd={handleAddCoefficient}
          classes={classes}
          matieres={matieres}
        />

        <AssignProfessorDialog
          open={isAffectProfOpen}
          onClose={() => setIsAffectProfOpen(false)}
          onAssign={handleAssignProfessor}
          profs={profs}
          matieres={matieres}
          classes={classes}
          annees={annees}
        />

        <AddAcademicYearDialog
          open={isAddAnneeOpen}
          onClose={() => setIsAddAnneeOpen(false)}
          onAdd={handleAddAnnee}
        />

        {/* Potentiellement un dialogue pour ajouter des trimestres si nécessaire */}
        {/* <AddTrimesterDialog
          open={isAddTrimestreOpen}
          onClose={() => setIsAddTrimestreOpen(false)}
          onAdd={handleAddTrimestres}
          annees={annees}
        /> */}

        {successMsg && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded">
            {successMsg}
          </div>
        )}
      </div>
    </div>
  );
}
