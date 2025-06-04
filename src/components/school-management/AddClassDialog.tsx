// Fichier g�n�r� automatiquement - AddClassDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AddClassDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onAddClass: (nom: string, niveau: string) => Promise<void>;
}

export const AddClassDialog: React.FC<AddClassDialogProps> = ({
  isOpen,
  setIsOpen,
  onAddClass
}) => {
  const [nom, setNom] = useState("");
  const [niveau, setNiveau] = useState("Primaire");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onAddClass(nom, niveau);
      setNom("");
      setNiveau("Primaire");
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une nouvelle classe</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="nom" className="text-right">
                Nom de la classe
              </label>
              <input
                id="nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                className="col-span-3 border rounded px-2 py-1"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <label htmlFor="niveau" className="text-right">
                Niveau
              </label>
              <select
                id="niveau"
                value={niveau}
                onChange={(e) => setNiveau(e.target.value)}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Ajout en cours..." : "Ajouter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};