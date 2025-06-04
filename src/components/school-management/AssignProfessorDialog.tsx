// Fichier g�n�r� automatiquement - AssignProfessorDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Professeur, Matiere, Classe, AnneeScolaire } from './types';

interface AssignProfessorDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  profs: Professeur[];
  matieres: Matiere[];
  classes: Classe[];
  annees: AnneeScolaire[];
  onAssignProfessor: (profId: string, matiereId: string, classesIds: string[], anneeId: string) => Promise<void>;
}

export const AssignProfessorDialog: React.FC<AssignProfessorDialogProps> = ({
  isOpen,
  setIsOpen,
  profs,
  matieres,
  classes,
  annees,
  onAssignProfessor
}) => {
  const [profId, setProfId] = useState("");
  const [matiereId, setMatiereId] = useState("");
  const [classesIds, setClassesIds] = useState<string[]>([]);
  const [anneeId, setAnneeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profId || !matiereId || classesIds.length === 0 || !anneeId) {
      alert("Veuillez sélectionner un professeur, une matière, au moins une classe et une année scolaire.");
      return;
    }
    
    setIsLoading(true);
    
    try {
      await onAssignProfessor(profId, matiereId, classesIds, anneeId);
      setProfId("");
      setMatiereId("");
      setClassesIds([]);
      setAnneeId("");
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Affecter un professeur à une matière et une classe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="prof" className="text-right">
                Professeur
              </label>
              <select
                id="prof"
                value={profId}
                onChange={(e) => setProfId(e.target.value)}
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
              <label htmlFor="classes" className="text-right">
                Classes (Ctrl+clic pour multiple)
              </label>
              <select
                id="classes"
                multiple
                value={classesIds}
                onChange={(e) => {
                  const options = Array.from(e.target.selectedOptions);
                  setClassesIds(options.map(option => option.value));
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
              <label htmlFor="annee" className="text-right">
                Année Scolaire
              </label>
              <select
                id="annee"
                value={anneeId}
                onChange={(e) => setAnneeId(e.target.value)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Affectation en cours..." : "Affecter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};