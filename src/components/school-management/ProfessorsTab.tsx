// Fichier g�n�r� automatiquement - ProfessorsTab.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { User, Users, Award, Calendar, Plus } from "lucide-react";
import { Affectation, Classe, AnneeScolaire, Professeur } from './types';
import { groupAffectationsByProf } from './utils';

interface ProfessorsTabProps {
  affectations: Affectation[];
  profs: Professeur[];
  classes: Classe[];
  annees: AnneeScolaire[];
  filterProf: string;
  setFilterProf: (value: string) => void;
  filterClasse: string;
  setFilterClasse: (value: string) => void;
  filterAnnee: string;
  setFilterAnnee: (value: string) => void;
  setIsAffectProfOpen: (open: boolean) => void;
}

export const ProfessorsTab: React.FC<ProfessorsTabProps> = ({
  affectations,
  profs,
  classes,
  annees,
  filterProf,
  setFilterProf,
  filterClasse,
  setFilterClasse,
  filterAnnee,
  setFilterAnnee,
  setIsAffectProfOpen
}) => {
  const filteredAffectations = affectations.filter(aff =>
    (!filterProf || aff.professeur?.id == filterProf) &&
    (!filterClasse || aff.classe?.id == filterClasse) &&
    (!filterAnnee || aff.annee_scolaire?.id == filterAnnee)
  );

  const grouped = groupAffectationsByProf(filteredAffectations);
  const profGroups = Object.values(grouped);

  return (
    <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-200">
          <User className="h-6 w-6" /> Affectation des professeurs
        </CardTitle>
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
        {profGroups.length === 0 ? (
          <div className="italic text-gray-500 text-center py-8">Aucune affectation trouvée.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {profGroups.map(profGroup => (
              <div
                key={profGroup.professeur.id}
                className="p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-800 shadow-lg transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
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
        )}
      </CardContent>
    </Card>
  );
};