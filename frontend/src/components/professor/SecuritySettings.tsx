import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormItem, FormLabel } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import apiClient from '@/lib/apiClient';

export function SecuritySettings() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({ 
    old: false, 
    new: false, 
    confirm: false 
  });

  const handlePasswordChange = async () => {
    if (!ancienMotDePasse || !nouveauMotDePasse || !confirmerMotDePasse) {
      toast({
        title: t.settings.requiredFields,
        description: t.settings.fillAllPasswordFields,
        variant: "destructive",
      });
      return;
    }

    if (nouveauMotDePasse !== confirmerMotDePasse) {
      toast({
        title: t.common.error,
        description: t.settings.passwordMismatch,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: t.common.error,
        description: t.settings.unauthenticatedUser,
        variant: "destructive",
      });
      return;
    }

    setIsSavingPassword(true);
    try {
      await apiClient.patch(`/users/${user.id}`, {
        ancienMotDePasse: ancienMotDePasse,
        nouveauMotDePasse: nouveauMotDePasse,
      });

      toast({ 
        title: t.common.success, 
        description: t.settings.passwordChangedSuccess 
      });
      setAncienMotDePasse('');
      setNouveauMotDePasse('');
      setConfirmerMotDePasse('');
    } catch (error: any) {
      toast({ 
        title: t.common.error, 
        description: error.response?.data?.message || error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="p-6 w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t.settings.security}</h1>

      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>{t.settings.changePassword}</CardTitle>
          <CardDescription>
            {t.settings.changePasswordDescription}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <FormItem>
            <FormLabel>{t.settings.oldPassword}</FormLabel>
            <div className="relative">
              <Input
                type={showPassword.old ? 'text' : 'password'}
                value={ancienMotDePasse}
                onChange={(e) => setAncienMotDePasse(e.target.value)}
                autoComplete="current-password"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                onClick={() => setShowPassword(p => ({ ...p, old: !p.old }))}
              >
                {showPassword.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormItem>

          <FormItem>
            <FormLabel>{t.settings.newPassword}</FormLabel>
            <div className="relative">
              <Input
                type={showPassword.new ? 'text' : 'password'}
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                autoComplete="new-password"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
              >
                {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormItem>

          <FormItem>
            <FormLabel>{t.settings.confirmPassword}</FormLabel>
            <div className="relative">
              <Input
                type={showPassword.confirm ? 'text' : 'password'}
                value={confirmerMotDePasse}
                onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                autoComplete="new-password"
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" 
                onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
              >
                {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </FormItem>
        </CardContent>

        <CardFooter className="flex justify-end">
          <Button onClick={handlePasswordChange} disabled={isSavingPassword}>
            {isSavingPassword ? t.settings.changingPassword : t.settings.changePasswordButton}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}