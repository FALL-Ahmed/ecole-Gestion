import React, { useState, useEffect, useCallback } from 'react';
import { Ecole } from '@/types/ecole';
import api from '@/lib/api'; // Assurez-vous d'avoir un client API configuré

// Importez vos composants UI et hooks
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { EcoleFormDialog } from './EcoleFormDialog';
import { useLanguage } from '@/contexts/LanguageContext';

const EcolesAdminPage = () => {
  const { t } = useLanguage();
  const [ecoles, setEcoles] = useState<Ecole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [ecoleToEdit, setEcoleToEdit] = useState<Ecole | null>(null);
    const [ecoleToDelete, setEcoleToDelete] = useState<Ecole | null>(null);

  const { toast } = useToast();

  const fetchEcoles = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/admin/ecoles');
      setEcoles(response.data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t.common.error,
        description: t.admin.ecoles.toasts.loadError,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    fetchEcoles();
  }, [fetchEcoles]);

  const handleOpenForm = (ecole?: Ecole) => {
    setEcoleToEdit(ecole || null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEcoleToEdit(null);
  };

  const handleSave = async (data: Omit<Ecole, 'id' | 'created_at' | 'updated_at'>, ecoleId?: number) => {
    try {
      if (ecoleId) {
        // Mode édition
        await api.put(`/admin/ecoles/${ecoleId}`, data);
        toast({ title: t.common.success, description: t.admin.ecoles.toasts.updateSuccess });
      } else {
        // Mode création
        await api.post('/admin/ecoles', data);
        toast({ title: t.common.success, description: t.admin.ecoles.toasts.addSuccess });
      }
      handleCloseForm();
      setEcoles(ecoles => ecoles.filter(ecole => ecole.id !== ecoleId));
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || (ecoleId ? t.admin.ecoles.toasts.updateError : t.admin.ecoles.toasts.addError);
      toast({ variant: "destructive", title: t.common.error, description: errorMessage });
          } finally {
      setEcoleToDelete(null); // Ferme la boîte de dialogue
    
    }
  };

  const handleDelete = async (ecoleId: number) => {
    try {
      await api.delete(`/admin/ecoles/${ecoleId}`);
      toast({ title: t.common.success, description: t.admin.ecoles.toasts.deleteSuccess });
      fetchEcoles(); // Recharger la liste
    } catch (error) {
      toast({ variant: "destructive", title: t.common.error, description: t.admin.ecoles.toasts.deleteError });
    }
  };

  if (isLoading) {
    return <div>{t.common.loading}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">{t.admin.ecoles.title}</h1>
          <p className="text-muted-foreground">{t.admin.ecoles.description}</p>
        </div>
        <Button onClick={() => handleOpenForm()}>{t.admin.ecoles.add}</Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.admin.ecoles.table.name}</TableHead>
              <TableHead>{t.admin.ecoles.table.subdomain}</TableHead>
              <TableHead>{t.admin.ecoles.table.dbName}</TableHead>
              <TableHead className="text-right">{t.admin.ecoles.table.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecoles.map((ecole) => (
              <TableRow key={ecole.id}>
                <TableCell>{ecole.nom_etablissement}</TableCell>
                <TableCell>{ecole.sous_domaine}</TableCell>
                <TableCell>{ecole.db_name}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleOpenForm(ecole)}>
                    {t.common.edit}
                  </Button>
                                  <Button variant="destructive" size="sm" onClick={() => setEcoleToDelete(ecole)}>{t.common.delete}</Button>

                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
 {/* Instance unique de la boîte de dialogue de suppression */}
      {ecoleToDelete && (
  <AlertDialog open onOpenChange={(open) => !open && setEcoleToDelete(null)}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t.admin.ecoles.deleteConfirmTitle}</AlertDialogTitle>
        <AlertDialogDescription>
          {t.admin.ecoles.deleteConfirmDescription.replace('{ecoleName}', ecoleToDelete.nom_etablissement)}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setEcoleToDelete(null)}>{t.common.cancel}</AlertDialogCancel>
        <AlertDialogAction
          onClick={() => handleDelete(ecoleToDelete.id)}
        >
          {t.common.confirm}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}

      <EcoleFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSave={handleSave}
        ecoleToEdit={ecoleToEdit}
      />
    </div>
  );
};

export default EcolesAdminPage;
