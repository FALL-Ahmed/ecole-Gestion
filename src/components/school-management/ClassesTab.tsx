// Fichier g�n�r� automatiquement - ClassesTab.tsx
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Plus, Calendar } from "lucide-react";

import { Classe } from './types';
import { groupClassesByNiveauAndAnnee, sortAnnees } from './utils';

interface ClassesTabProps {
  classes: Classe[];
  setIsAddClasseOpen: (open: boolean) => void;
  successMsg: string;
}

export const ClassesTab: React.FC<ClassesTabProps> = ({ 
  classes, 
  setIsAddClasseOpen, 
  successMsg 
}) => {
  const groupedClasses = groupClassesByNiveauAndAnnee(classes);

  return (
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
            Object.entries(groupedClasses).map(([niveau, annees]) => (
              <div key={niveau} className="mb-10">
                <h3 className="text-xl font-bold text-blue-700 mb-4 capitalize flex items-center gap-2">
                  <Users className="h-6 w-6" /> {niveau}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {sortAnnees(Object.keys(annees)).map(annee => (
                    <div
                      key={annee}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow p-4 mb-2 transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl"
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
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow-sm font-semibold text-blue-900 dark:text-blue-100 text-base transition-all duration-300 ease-out hover:bg-blue-100 dark:hover:bg-blue-900 hover:scale-105"
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
  );
};