import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Ecole } from '@/types/ecole';
import { useLanguage } from '@/contexts/LanguageContext';

// Importez vos composants UI (exemple avec shadcn/ui)
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const formSchema = z.object({
  nom_etablissement: z.string().min(3, { message: "Le nom doit contenir au moins 3 caractères." }),
  sous_domaine: z.string().min(3, { message: "Le sous-domaine doit contenir au moins 3 caractères." }),
  db_name: z.string().min(3, { message: "Le nom de la base de données doit contenir au moins 3 caractères." }),
});

type EcoleFormData = z.infer<typeof formSchema>;

interface EcoleFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EcoleFormData, ecoleId?: number) => Promise<void>;
  ecoleToEdit?: Ecole | null;
}

export const EcoleFormDialog: React.FC<EcoleFormDialogProps> = ({ isOpen, onClose, onSave, ecoleToEdit }) => {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!ecoleToEdit;

  const form = useForm<EcoleFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nom_etablissement: '',
      sous_domaine: '',
      db_name: '',
    },
  });

  useEffect(() => {
    if (ecoleToEdit) {
      form.reset({ ...ecoleToEdit });
    } else {
      form.reset({ nom_etablissement: '', sous_domaine: '', db_name: '' });
    }
  }, [ecoleToEdit, form.reset]);

  const handleSubmit = async (data: EcoleFormData) => {
    setIsSaving(true);
    await onSave(data, ecoleToEdit?.id);
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? t.admin.ecoles.form.titleEdit : t.admin.ecoles.form.titleCreate}</DialogTitle>
          <DialogDescription>{t.admin.ecoles.form.description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nom_etablissement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.ecoles.form.nameLabel}</FormLabel>
                  <FormControl><Input placeholder={t.admin.ecoles.form.namePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sous_domaine"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.ecoles.form.subdomainLabel}</FormLabel>
                  <FormControl><Input placeholder={t.admin.ecoles.form.subdomainPlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="db_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.admin.ecoles.form.dbNameLabel}</FormLabel>
                  <FormControl><Input placeholder={t.admin.ecoles.form.dbNamePlaceholder} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={onClose}>{t.common.cancel}</Button>
              <Button type="submit" disabled={isSaving}>{isSaving ? t.admin.ecoles.form.saving : t.admin.ecoles.form.save}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
