// Fichier g�n�r� automatiquement - AcademicYearsTab.tsx
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Calendar, ArrowRightIcon, Plus } from "lucide-react";

import { AnneeScolaire, Trimestre } from './types';

interface AcademicYearsTabProps {
  annees: AnneeScolaire[];
  trimestres: Trimestre[];
  setIsAddAnneeOpen: (open: boolean) => void;
}

export const AcademicYearsTab: React.FC<AcademicYearsTabProps> = ({
  annees,
  trimestres,
  setIsAddAnneeOpen
}) => {
  const [openAnneeTrimestresId, setOpenAnneeTrimestresId] = useState<string | null>(null);

  return (
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
  );
};