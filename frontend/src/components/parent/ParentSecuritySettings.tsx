import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ParentSecuritySettings() {
  const { user } = useAuth(); // On récupère l'objet `user` qui doit contenir l'ID du parent.
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError(t.security.passwordMismatch || 'Les nouveaux mots de passe ne correspondent pas.');
      return;
    }

    if (newPassword.length < 8) {
      setError(t.security.passwordTooShort || 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
      return;
    }

    setIsLoading(true);

    try {
      if (!user?.id) {
        throw new Error(t.security.unauthenticatedUser || "Utilisateur non authentifié.");
      }

      await axios.patch(
        `${API_URL}/api/parents/change-password`,
        {
          parentId: user.id, // On envoie l'ID du parent dans la requête
          currentPassword,
          newPassword,
        }
      );

      const successMessage = t.security.passwordChangedSuccess || 'Mot de passe modifié avec succès !';
      setSuccess(successMessage);
      toast({
        title: t.security.success || 'Succès',
        description: successMessage,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || t.security.passwordChangeError || 'Une erreur est survenue lors de la modification du mot de passe.';
      setError(errorMessage);
      toast({
        title: t.common.error || 'Erreur',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold mb-6">{t.sidebar.settings}</h1>
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl">{t.security.changePassword || 'Changer le mot de passe'}</CardTitle>
              <CardDescription>{t.security.changePasswordDescParent || 'Mettez à jour votre mot de passe pour sécuriser votre compte parent.'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">{t.security.currentPassword || 'Mot de passe actuel'}</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t.security.newPassword || 'Nouveau mot de passe'}</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.security.confirmNewPassword || 'Confirmer le nouveau mot de passe'}</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700" />
            </div>
            {error && <p className="text-sm font-medium text-red-500 dark:text-red-400">{error}</p>}
            {success && <p className="text-sm font-medium text-green-500 dark:text-green-400">{success}</p>}
            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.security.saving || 'Sauvegarde...'}
                  </>
                ) : (
                  t.security.updatePassword || 'Mettre à jour le mot de passe'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
