import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Eye, EyeOff, Lock, CheckCircle, AlertCircle as AlertCircleIcon } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function ParentSecuritySettings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/\d/.test(password)) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  };

  const passwordStrengthScore = checkPasswordStrength(newPassword);
  const getStrengthProps = (score: number) => {
    if (newPassword.length === 0) return null;
    switch (score) {
      case 0:
      case 1: return { label: t.security.strength.weak || 'Faible', color: 'bg-red-500', value: 20 };
      case 2: return { label: t.security.strength.medium || 'Moyen', color: 'bg-yellow-500', value: 40 };
      case 3: return { label: t.security.strength.good || 'Bon', color: 'bg-blue-500', value: 60 };
      case 4: return { label: t.security.strength.strong || 'Fort', color: 'bg-green-500', value: 80 };
      case 5: return { label: t.security.strength.veryStrong || 'Très fort', color: 'bg-emerald-500', value: 100 };
      default: return null;
    }
  };
  const strengthProps = getStrengthProps(passwordStrengthScore);

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

    if (newPassword === currentPassword) {
      setError(t.security.passwordSameAsOld || 'Le nouveau mot de passe doit être différent de l\'ancien.');
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
      <Card className="max-w-2xl mx-auto shadow-lg border-border/40 bg-card/80 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <ShieldCheck className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">{t.security.changePassword || 'Changer le mot de passe'}</CardTitle>
              <CardDescription>{t.security.changePasswordDescParent || 'Mettez à jour votre mot de passe pour sécuriser votre compte parent.'}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative space-y-2">
              <Label htmlFor="currentPassword" className="font-medium">{t.security.currentPassword || 'Mot de passe actuel'}</Label>
              <Lock className="absolute left-3 top-10 h-4 w-4 text-muted-foreground" />
              <Input id="currentPassword" type={showCurrentPassword ? 'text' : 'password'} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700 pl-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-8 h-7 w-7" onClick={() => setShowCurrentPassword(!showCurrentPassword)}>
                {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="newPassword" className="font-medium">{t.security.newPassword || 'Nouveau mot de passe'}</Label>
              <Lock className="absolute left-3 top-10 h-4 w-4 text-muted-foreground" />
              <Input id="newPassword" type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700 pl-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-8 h-7 w-7" onClick={() => setShowNewPassword(!showNewPassword)}>
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {strengthProps && (
                <div className="flex items-center gap-2 pt-1">
                  <Progress value={strengthProps.value} className={`h-1.5 ${strengthProps.color}`} />
                  <span className="text-xs font-medium text-muted-foreground">{strengthProps.label}</span>
                </div>
              )}
            </div>
            <div className="relative space-y-2">
              <Label htmlFor="confirmPassword" className="font-medium">{t.security.confirmNewPassword || 'Confirmer le nouveau mot de passe'}</Label>
              <Lock className="absolute left-3 top-10 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isLoading} className="dark:bg-gray-700 pl-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-8 h-7 w-7" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Alert variant="destructive">
                    <AlertCircleIcon className="h-4 w-4" />
                    <AlertTitle>{t.common.error}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-300">{t.security.success}</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={isLoading || !currentPassword || !newPassword || newPassword !== confirmPassword} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t.security.saving || 'Sauvegarde...'}
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    {t.security.updatePassword || 'Mettre à jour le mot de passe'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
