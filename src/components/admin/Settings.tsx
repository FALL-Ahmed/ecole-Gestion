import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react";


export function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  
  // Données de l'établissement
  const [accountForm, setAccountForm] = useState({
    schoolName: "Sources des Sciences",
    directorName: "M. Martin Dupont",
    email: "direction@sources-sciences.fr",
    phone: "01 23 45 67 89",
    address: "123 Avenue de l'Éducation, 75001 Paris",
    website: "www.sources-sciences.fr"
  });

  // Paramètres de notification
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    gradeNotifications: true,
    absenceNotifications: true,
    systemNotifications: false,
    scheduleChanges: true
  });

  // Année scolaire
  const [academicYear, setAcademicYear] = useState({
    startDate: new Date('2023-09-01'),
    endDate: new Date('2024-07-05'),
    terms: [
      { id: 1, name: 'Trimestre 1', startDate: new Date('2023-09-01'), endDate: new Date('2023-11-30') },
      { id: 2, name: 'Trimestre 2', startDate: new Date('2023-12-01'), endDate: new Date('2024-03-31') },
      { id: 3, name: 'Trimestre 3', startDate: new Date('2024-04-01'), endDate: new Date('2024-07-05') }
    ]
  });

  // Sécurité
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    autoLock: true,
    passwordPolicy: true,
    sessionTimeout: 30
  });

  const handleAccountChange = (field: string, value: string) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleAcademicDateChange = (type: string, date: Date, termId?: number) => {
    if (termId) {
      setAcademicYear(prev => ({
        ...prev,
        terms: prev.terms.map(term => 
          term.id === termId 
            ? { ...term, [type]: date } 
            : term
        )
      }));
    } else {
      setAcademicYear(prev => ({ ...prev, [type]: date }));
    }
  };

  const handleSecurityChange = (field: string, value: boolean | number) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  const saveSettings = () => {
    toast({
      title: "Paramètres sauvegardés",
      description: `Vos paramètres ${getTabDescription(activeTab)} ont été mis à jour.`,
    });
  };

  const getTabDescription = (tab: string) => {
    switch(tab) {
      case 'account': return "de l'établissement";
      case 'notifications': return "de notification";
      case 'academic': return "d'année scolaire";
      case 'security': return "de sécurité";
      default: return "";
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres de l'établissement</h1>

      <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="account">Établissement</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="academic">Année scolaire</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'établissement</CardTitle>
              <CardDescription>
                Gérez les informations générales et les coordonnées de votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormItem>
                  <FormLabel>Nom de l'établissement *</FormLabel>
                  <Input
                    value={accountForm.schoolName}
                    onChange={(e) => handleAccountChange('schoolName', e.target.value)}
                    required
                  />
                </FormItem>
                
                <FormItem>
                  <FormLabel>Nom du directeur *</FormLabel>
                  <Input
                    value={accountForm.directorName}
                    onChange={(e) => handleAccountChange('directorName', e.target.value)}
                    required
                  />
                </FormItem>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormItem>
                  <FormLabel>Email de contact *</FormLabel>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => handleAccountChange('email', e.target.value)}
                    required
                  />
                </FormItem>
                
                <FormItem>
                  <FormLabel>Téléphone *</FormLabel>
                  <Input
                    value={accountForm.phone}
                    onChange={(e) => handleAccountChange('phone', e.target.value)}
                    required
                  />
                </FormItem>
              </div>
              
              <FormItem>
                <FormLabel>Adresse *</FormLabel>
                <Input
                  value={accountForm.address}
                  onChange={(e) => handleAccountChange('address', e.target.value)}
                  required
                />
              </FormItem>
              
              <FormItem>
                <FormLabel>Site web</FormLabel>
                <Input
                  value={accountForm.website}
                  onChange={(e) => handleAccountChange('website', e.target.value)}
                  placeholder="https://www.exemple.fr"
                />
              </FormItem>
              
              <Separator />
              
              <FormItem>
                <FormLabel>Logo de l'établissement</FormLabel>
                <div className="flex items-center gap-4 mt-2">
                  <div className="w-16 h-16 bg-gray-100 border rounded flex items-center justify-center text-gray-400">
                    Logo
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button variant="outline" className="w-fit">
                      Changer le logo
                    </Button>
                    <p className="text-xs text-gray-500">
                      Formats acceptés: JPG, PNG (max. 2MB)
                    </p>
                  </div>
                </div>
              </FormItem>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de notification</CardTitle>
              <CardDescription>
                Configurez les préférences de notification pour l'établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6">
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Notifications par email</FormLabel>
                    <FormDescription>
                      Activer les notifications par email pour les administrateurs
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Nouvelles notes</FormLabel>
                    <FormDescription>
                      Notifier les enseignants lors de la publication de nouvelles notes
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.gradeNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('gradeNotifications', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Absences des élèves</FormLabel>
                    <FormDescription>
                      Notifier les responsables lors des absences non justifiées
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.absenceNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('absenceNotifications', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Modifications d'emploi du temps</FormLabel>
                    <FormDescription>
                      Notifier les enseignants des changements d'emploi du temps
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.scheduleChanges}
                    onCheckedChange={(checked) => handleNotificationChange('scheduleChanges', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Notifications système</FormLabel>
                    <FormDescription>
                      Recevoir les mises à jour et informations système
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.systemNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('systemNotifications', checked)}
                  />
                </FormItem>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Configuration de l'année scolaire</CardTitle>
              <CardDescription>
                Définissez les dates importantes de l'année scolaire
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormItem>
                  <FormLabel>Date de début d'année *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !academicYear.startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {academicYear.startDate ? format(academicYear.startDate, "PPP") : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={academicYear.startDate}
                        onSelect={(date) => date && handleAcademicDateChange('startDate', date)}
                        initialFocus
                        fromDate={new Date('2023-01-01')}
                        toDate={new Date('2023-12-31')}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
                
                <FormItem>
                  <FormLabel>Date de fin d'année *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !academicYear.endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {academicYear.endDate ? format(academicYear.endDate, "PPP") : "Choisir une date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarPicker
                        mode="single"
                        selected={academicYear.endDate}
                        onSelect={(date) => date && handleAcademicDateChange('endDate', date)}
                        initialFocus
                        fromDate={new Date('2024-01-01')}
                        toDate={new Date('2024-12-31')}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              </div>
              
              <Separator className="my-4" />
              
              <h3 className="font-medium text-lg">Périodes scolaires</h3>
              
              <div className="space-y-6">
                {academicYear.terms.map((term) => (
                  <div key={term.id} className="space-y-4">
                    <h4 className="font-medium">{term.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormItem>
                        <FormLabel>Date de début</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !term.startDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {term.startDate ? format(term.startDate, "PPP") : "Choisir une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarPicker
                              mode="single"
                              selected={term.startDate}
                              onSelect={(date) => date && handleAcademicDateChange('startDate', date, term.id)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                      
                      <FormItem>
                        <FormLabel>Date de fin</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !term.endDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {term.endDate ? format(term.endDate, "PPP") : "Choisir une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <CalendarPicker
                              mode="single"
                              selected={term.endDate}
                              onSelect={(date) => date && handleAcademicDateChange('endDate', date, term.id)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </FormItem>
                    </div>
                    {term.id < academicYear.terms.length && <Separator />}
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Paramètres de sécurité</CardTitle>
              <CardDescription>
                Configurez les options de sécurité pour votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6">
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Authentification à deux facteurs</FormLabel>
                    <FormDescription>
                      Exiger une vérification supplémentaire pour les comptes administrateurs
                    </FormDescription>
                  </div>
                  <Switch
                    checked={securitySettings.twoFactorAuth}
                    onCheckedChange={(checked) => handleSecurityChange('twoFactorAuth', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Verrouillage automatique</FormLabel>
                    <FormDescription>
                      Verrouiller les sessions après une période d'inactivité
                    </FormDescription>
                  </div>
                  <Switch
                    checked={securitySettings.autoLock}
                    onCheckedChange={(checked) => handleSecurityChange('autoLock', checked)}
                  />
                </FormItem>
                
                {securitySettings.autoLock && (
                  <div className="ml-6 pl-6 border-l">
                    <FormItem>
                      <FormLabel>Délai avant verrouillage (minutes)</FormLabel>
                      <Input
                        type="number"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
                        min="5"
                        max="120"
                        className="w-24"
                      />
                    </FormItem>
                  </div>
                )}
                
                <Separator />
                
                <FormItem className="flex items-center justify-between space-y-0">
                  <div className="space-y-1">
                    <FormLabel>Politique de mot de passe</FormLabel>
                    <FormDescription>
                      Exiger des mots de passe complexes pour tous les utilisateurs
                    </FormDescription>
                  </div>
                  <Switch
                    checked={securitySettings.passwordPolicy}
                    onCheckedChange={(checked) => handleSecurityChange('passwordPolicy', checked)}
                  />
                </FormItem>
                
                <Separator />
                
                <FormItem>
                  <FormLabel>Journalisation des activités</FormLabel>
                  <div className="mt-2">
                    <Button variant="outline">
                      Voir les journaux d'activité
                    </Button>
                  </div>
                </FormItem>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}