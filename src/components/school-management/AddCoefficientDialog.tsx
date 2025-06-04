// Fichier g�n�r� automatiquement - AddCoefficientDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Classe, Matiere } from './types';

interface AddCoefficientDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  classes: Classe[];
  matieres: Matiere[];
  onAddCoefficient: (classeId: string, matiereId: string, coefficient: number) => Promise<void>;
}

export const AddCoefficientDialog: React.FC<AddCoefficientDialogProps> = ({
  isOpen,
  setIsOpen,
  classes,
  matieres,
  onAddCoefficient
}) => {
  const [classeId, setClasseId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [coefficient, setCoefficient] = useState(1);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!classeId || !matiereId || coefficient <= 0) {
      setError("Veuillez sélectionner une classe, une matière et un coefficient valide.");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      await onAddCoefficient(classeId, matiereId, coefficient);
      setClasseId("");
      setMatiereId("");
      setCoefficient(1);
      setIsOpen(false);
    } catch (err) {
      setError(err.message || "Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un coefficient</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="classe" className="text-right">
                Classe
              </label>
              <select
                id="classe"
                value={classeId}
                onChange={(e) => setClasseId(e.target.value)}
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
              <label htmlFor="matiere" className="text-right">
                Matière
              </label>
              <select
                id="matiere"
                value={matiereId}
                onChange={(e) => setMatiereId(e.target.value)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ajout en cours..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};