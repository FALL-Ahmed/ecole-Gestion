// Fichier généré automatiquement - CoefficientsTab.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Award, Calendar, Plus, Users } from "lucide-react";

import { Coefficient, Classe } from './types';
import { groupCoefficientsByNiveauEtAnnee, groupClassesByNiveauAndAnnee, sortAnnees } from './utils';

interface CoefficientsTabProps {
  coefficients: Coefficient[];
  classes: Classe[];
  setIsAddCoeffOpen: (open: boolean) => void;
  openAnnee: string | null;
  setOpenAnnee: (annee: string | null) => void;
}

export const CoefficientsTab: React.FC<CoefficientsTabProps> = ({
  coefficients,
  classes,
  setIsAddCoeffOpen,
  openAnnee,
  setOpenAnnee,
}) => {
  // Group coefficients par niveau et année
  const groupedCoefficients = groupCoefficientsByNiveauEtAnnee(coefficients, classes);
  const groupedClasses = groupClassesByNiveauAndAnnee(classes);

  return (
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
          {Object.keys(groupedCoefficients).length === 0 ? (
            <div className="text-gray-500 italic">Aucun coefficient trouvé.</div>
          ) : (
            Object.entries(groupedCoefficients).map(([niveau, annees]) => (
              <div key={niveau} className="mb-10">
                <h3 className="text-xl font-bold text-blue-700 mb-4 capitalize flex items-center gap-2">
                  <Users className="h-6 w-6" /> {niveau}
                </h3>

                {sortAnnees(Object.keys(annees)).map((annee) => {
                  const key = niveau + annee; // clé unique pour openAnnee

                  return (
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
                          onClick={() => setOpenAnnee(openAnnee === key ? null : key)}
                          type="button"
                        >
                          <Award className="h-5 w-5" />
                          {openAnnee === key ? "Masquer les matières" : "Voir les matières"}
                          <span className="ml-2">{openAnnee === key ? "▲" : "▼"}</span>
                        </button>

                        {openAnnee === key && (
                          <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                            {(() => {
                              // Récupérer la première classe correspondante à ce niveau et année
                              const firstClasse = groupedClasses?.[niveau]?.[annee]?.[0];
                              if (!firstClasse)
                                return <span className="text-xs text-gray-400 italic">Aucune matière</span>;

                              // Filtrer les coefficients pour cette classe
                              const coefs = coefficients.filter(c => c.classe?.id === firstClasse.id);

                              if (coefs.length === 0)
                                return <span className="text-xs text-gray-400 italic">Aucun coefficient</span>;

                              // Afficher les coefficients
                              return coefs.map(c => (
                                <li
                                  key={c.matiere.id}
                                  className="flex flex-col items-start gap-2 px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow transition-all duration-300 hover:bg-blue-50 dark:hover:bg-blue-800 hover:shadow-lg"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <Award className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />
                                    <span className="font-semibold text-blue-900 dark:text-blue-100 text-base">
                                      {c.matiere.nom}
                                    </span>
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
                  );
                })}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
