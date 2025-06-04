// Fichier g�n�r� automatiquement - AddAcademicYearDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddAcademicYearDialogProps {
  isAddAnneeOpen: boolean;
  setIsAddAnneeOpen: (open: boolean) => void;
  isAddTrimestreOpen: boolean;
  setIsAddTrimestreOpen: (open: boolean) => void;
  onAddAnnee: (libelle: string, dateDebut: string, dateFin: string) => Promise<string>;
  onAddTrimestres: (anneeId: string, trimestres: {
    nom: string;
    date_debut: string;
    date_fin: string;
  }[]) => Promise<void>;
}

export const AddAcademicYearDialog: React.FC<AddAcademicYearDialogProps> = ({
  isAddAnneeOpen,
  setIsAddAnneeOpen,
  isAddTrimestreOpen,
  setIsAddTrimestreOpen,
  onAddAnnee,
  onAddTrimestres
}) => {
  const [anneeLibelle, setAnneeLibelle] = useState("");
  const [anneeDebut, setAnneeDebut] = useState("");
  const [anneeFin, setAnneeFin] = useState("");
  const [anneeId, setAnneeId] = useState<string | null>(null);
  const [trimestre1Debut, setTrimestre1Debut] = useState("");
  const [trimestre1Fin, setTrimestre1Fin] = useState("");
  const [trimestre2Debut, setTrimestre2Debut] = useState("");
  const [trimestre2Fin, setTrimestre2Fin] = useState("");
  const [trimestre3Debut, setTrimestre3Debut] = useState("");
  const [trimestre3Fin, setTrimestre3Fin] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmitAnnee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newAnneeId = await onAddAnnee(anneeLibelle, anneeDebut, anneeFin);
      setAnneeId(newAnneeId);
      setAnneeLibelle("");
      setAnneeDebut("");
      setAnneeFin("");
      setIsAddAnneeOpen(false);
      setIsAddTrimestreOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTrimestres = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anneeId) return;
    
    setIsLoading(true);
    try {
      await onAddTrimestres(anneeId, [
        { nom: "Trimestre 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin },
        { nom: "Trimestre 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin },
        { nom: "Trimestre 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin }
      ]);
      setIsAddTrimestreOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isAddAnneeOpen || isAddTrimestreOpen} onOpenChange={open => {
      setIsAddAnneeOpen(open);
      setIsAddTrimestreOpen(false);
    }}>
      <DialogContent className="rounded-2xl shadow-2xl border-2 border-blue-300 dark:border-blue-900 w-full max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-center text-xl text-blue-700 dark:text-blue-200">
            {isAddAnneeOpen ? "Étape 1 : Ajouter une année scolaire" : "Étape 2 : Ajouter les 3 trimestres"}
          </DialogTitle>
        </DialogHeader>

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

        {isAddAnneeOpen && (
          <form onSubmit={handleSubmitAnnee} className="space-y-6">
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

            <Button type="submit" className="btn-primary w-full text-white font-bold py-2" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Continuer vers les trimestres"}
            </Button>
          </form>
        )}

        {isAddTrimestreOpen && (
          <form onSubmit={handleSubmitTrimestres} className="space-y-6">
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

            <Button type="submit" className="btn-primary w-full text-white font-bold py-2" disabled={isLoading}>
              {isLoading ? "Enregistrement..." : "Enregistrer les trimestres"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};