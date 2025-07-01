import React, { useState, useEffect, useCallback } from 'react';
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
  FormItem,
  FormLabel,
  FormDescription,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext'; // Import the context hook

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';


export function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');

  // School data
  const [accountForm, setAccountForm] = useState({
    schoolName: "",
    directorName: "",
    email: "",
    phone: "",
    address: "",
    website: ""
  });

  // Notification settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    gradeNotifications: true,
    absenceNotifications: true,
    systemNotifications: false,
    scheduleChanges: true
  });

  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: true,
    autoLock: true,
    passwordPolicy: true,
    sessionTimeout: 30
  });

  // Data for current academic year
  const [academicYearsList, setAcademicYearsList] = useState<any[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<number | null>(null);
  const [isLoadingAcademicConfig, setIsLoadingAcademicConfig] = useState(true);
  const [isLoadingEstablishmentInfo, setIsLoadingEstablishmentInfo] = useState(true);

  const { fetchEstablishmentInfo: fetchEstablishmentInfoContext } = useEstablishmentInfo(); // Get the context's fetch function

  // Utility function to find academic year name by ID
  const getAcademicYearNameById = useCallback((id: number | null) => {
    if (id === null) {
      return "Sélectionnez une année scolaire";
    }
    const numericId = typeof id === 'string' ? parseInt(id) : id;

    const year = academicYearsList.find((y: any) => y.id === numericId);

    if (year) {
      const startDate = new Date(year.date_debut);
      const endDate = new Date(year.date_fin);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Invalid dates for academic year:", year);
        return year.libelle || `Année ID ${id} (dates invalides)`;
      }
      return `${year.libelle} (${format(startDate, 'yyyy')} - ${format(endDate, 'yyyy')})`;
    }
    return "Année inconnue";
  }, [academicYearsList]);

  // Fetches all available academic years
  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`${API_URL}/api/annees-academiques`);
      if (!response.ok) {
        throw new Error('Failed to fetch academic years');
      }
      const data = await response.json();
      setAcademicYearsList(data);
    } catch (error: any) {
      console.error('Error fetching academic years:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger les années académiques disponibles: ${error.message}.`,
        variant: "destructive",
      });
    }
  };

  // Fetches establishment information
  const fetchEstablishmentInfo = async () => {
    setIsLoadingEstablishmentInfo(true);
    try {
      const response = await fetch(`${API_URL}/api/establishment-info`);
      if (!response.ok) {
        if (response.status === 404) {
          // No info found, use defaults or empty strings
          setAccountForm({ schoolName: "", directorName: "", email: "", phone: "", address: "", website: "" });
          toast({ title: "Information", description: "Aucune information d'établissement trouvée. Vous pouvez en configurer.", variant: "default" });
          return;
        }
        throw new Error('Failed to fetch establishment information');
      }
      const data = await response.json();
      setAccountForm({
        schoolName: data.schoolName || "",
        directorName: data.directorName || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        website: data.website || ""
      });
    } catch (error: any) {
      console.error('Error fetching establishment information:', error);
      toast({ title: "Erreur", description: `Impossible de charger les informations de l'établissement: ${error.message}.`, variant: "destructive" });
      setAccountForm({ schoolName: "Erreur chargement", directorName: "", email: "", phone: "", address: "", website: "" });
    } finally {
      setIsLoadingEstablishmentInfo(false);
    }
  };

  // Fetches the currently configured academic year ID
  const fetchCurrentAcademicYearConfiguration = async () => {
    try {
      const response = await fetch(`${API_URL}/api/configuration`);
      if (!response.ok) {
        if (response.status === 404) {
          setCurrentAcademicYearId(null);
          return;
        }
        throw new Error('Failed to fetch current academic year configuration');
      }
      const data = await response.json();
      // The backend returns annee_scolaire as an object, so we access its id
      setCurrentAcademicYearId(data.annee_scolaire?.id || null); // Use optional chaining for safety
    } catch (error: any) {
      console.error('Error fetching current academic year configuration:', error);
      toast({
        title: "Erreur",
        description: `Impossible de charger la configuration de l'année scolaire actuelle: ${error.message}.`,
        variant: "destructive",
      });
      setCurrentAcademicYearId(null);
    }
  };

  // Combined effect to load all academic data
  useEffect(() => {
    const loadAcademicData = async () => {
      setIsLoadingAcademicConfig(true);
      await fetchAcademicYears();
      // Establishment info is independent of academic years list for its initial fetch
      await fetchEstablishmentInfo();
    };
    loadAcademicData();
  }, []);

  // This useEffect will run when academicYearsList is updated
  useEffect(() => {
    if (academicYearsList.length > 0 || !isLoadingAcademicConfig) { // Ensure it runs even if list is empty but initial load attempt finished
      fetchCurrentAcademicYearConfiguration().then(() => {
        setIsLoadingAcademicConfig(false);
      });
    } else if (academicYearsList.length === 0 && !isLoadingAcademicConfig) { // Handles case where fetchAcademicYears finishes with empty list
      setIsLoadingAcademicConfig(false);
    }
  }, [academicYearsList]);


  const handleAccountChange = (field: string, value: string) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNotificationChange = (field: string, value: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSecurityChange = (field: string, value: number | boolean) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }));
  };

  const handleCurrentAcademicYearChange = (value: string) => {
    setCurrentAcademicYearId(parseInt(value));
  };

  const saveSettings = async () => {
    let success = true;
    let description = `Vos paramètres ${getTabDescription(activeTab)} ont été mis à jour.`;

    if (activeTab === 'account') {
      try {
        const response = await fetch(`${API_URL}/api/establishment-info`, {
          method: 'POST', // Or PUT, depending on your API design for single resource
          headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
            ...accountForm,
            // Convert empty strings to null for optional URL fields
            website: accountForm.website === "" ? null : accountForm.website,
            // Ajoutez d'autres champs optionnels si nécessaire
          }),        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Échec de la sauvegarde des informations de l'établissement.");
        }
        await fetchEstablishmentInfo(); // Re-fetch to confirm
        await fetchEstablishmentInfoContext(); // Trigger update in shared context
      } catch (error: any) {
        console.error('Error saving establishment information:', error);
        description = `Erreur lors de la sauvegarde des informations de l'établissement: ${error.message}`;
        success = false;
      }
    } else if (activeTab === 'notifications') {
      // TODO: Implement saving notification settings to a dedicated endpoint or /api/configuration
      description = "La sauvegarde des paramètres de notification n'est pas encore implémentée.";
      success = false; // Mark as not successful until implemented
    } else if (activeTab === 'security') {
      // TODO: Implement saving security settings
    } else if (activeTab === 'academic') {
      if (currentAcademicYearId === null) {
        toast({
          title: "Erreur de sauvegarde",
          description: "Veuillez sélectionner une année scolaire avant d'enregistrer.",
          variant: "destructive",
        });
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/configuration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            annee_scolaire_id: currentAcademicYearId // Send as direct ID
          }),
          // --- END OF FIX ---
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to save academic year configuration');
        }

        await fetchCurrentAcademicYearConfiguration(); // Re-fetch to ensure UI reflects the DB
        description = "L'année scolaire actuelle a été configurée avec succès.";

      } catch (error: any) {
        console.error('Error saving academic year configuration:', error);
        description = `Erreur lors de l'enregistrement de l'année scolaire actuelle : ${error.message}`;
        success = false;
      }
    }

    toast({
      title: success ? "Paramètres sauvegardés" : "Erreur de sauvegarde",
      description: description,
      variant: success ? "default" : "destructive",
    });
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'account': return "de l'établissement";
      case 'notifications': return "de notification";
      case 'academic': return "d'année scolaire";
      case 'security': return "de sécurité";
      default: return "";
    }
  };

  return (
    <div className="p-6 w-full mx-auto">
      <h1 className="text-2xl font-bold mb-6">Paramètres de l'établissement</h1>

      <Tabs defaultValue="account" value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
       <TabsList className="flex flex-row flex-wrap w-full gap-2 sm:gap-4 justify-center mb-8">
  <TabsTrigger
    value="account"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Établissement
  </TabsTrigger>
  <TabsTrigger
    value="notifications"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Notifications
  </TabsTrigger>
  <TabsTrigger
    value="academic"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Année scolaire
  </TabsTrigger>
  <TabsTrigger
    value="security"
    className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
  >
    Sécurité
  </TabsTrigger>
</TabsList>
<div className="h-4 sm:h-12"></div>

        <TabsContent value="account" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Informations de l'établissement</CardTitle>
              <CardDescription>
                Gérez les informations générales et les coordonnées de votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <FormItem className="w-full">
                  <FormLabel>Nom de l'établissement *</FormLabel>
                  <Input
                    value={accountForm.schoolName}
                    onChange={(e) => handleAccountChange('schoolName', e.target.value)}
                    required
                    className="w-full"
                  />
                </FormItem>
                <FormItem className="w-full">
                  <FormLabel>Nom du directeur *</FormLabel>
                  <Input
                    value={accountForm.directorName}
                    onChange={(e) => handleAccountChange('directorName', e.target.value)}
                    required
                    className="w-full"
                  />
                </FormItem>
                
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <FormItem className="w-full">
                  <FormLabel>Email de contact *</FormLabel>
                  <Input
                    type="email"
                    value={accountForm.email}
                    onChange={(e) => handleAccountChange('email', e.target.value)}
                    required
                    className="w-full"
                  />
                </FormItem>

                <FormItem className="w-full">
                  <FormLabel>Téléphone *</FormLabel>
                  <Input
                    value={accountForm.phone}
                    onChange={(e) => handleAccountChange('phone', e.target.value)}
                    required
                    className="w-full"
                  />
                </FormItem>
              </div>

              <FormItem className="w-full">
                <FormLabel>Adresse *</FormLabel>
                <Input
                  value={accountForm.address}
                  onChange={(e) => handleAccountChange('address', e.target.value)}
                  required
                  className="w-full"
                />
              </FormItem>

              <FormItem className="w-full">
                <FormLabel>Site web</FormLabel>
                <Input
                  value={accountForm.website}
                  onChange={(e) => handleAccountChange('website', e.target.value)}
                  placeholder="https://www.exemple.fr"
                  className="w-full"
                />
              </FormItem>

              <Separator />

              
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Paramètres de notification</CardTitle>
              <CardDescription>
                Configurez les préférences de notification pour l'établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 w-full">
                <FormItem className="flex items-center justify-between space-y-0 w-full">
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

                


                <FormItem className="flex items-center justify-between space-y-0 w-full">
                  <div className="space-y-1">
                    <FormLabel>Absences des élèves</FormLabel>
                    <FormDescription>
                      Notifiez les responsables lors des absences non justifiées
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.absenceNotifications}
                    onCheckedChange={(checked) => handleNotificationChange('absenceNotifications', checked)}
                  />
                </FormItem>

                <Separator />

                <FormItem className="flex items-center justify-between space-y-0 w-full">
                  <div className="space-y-1">
                    <FormLabel>Modifications d'emploi du temps</FormLabel>
                    <FormDescription>
                      Notifiez les enseignants des changements d'emploi du temps
                    </FormDescription>
                  </div>
                  <Switch
                    checked={notificationSettings.scheduleChanges}
                    onCheckedChange={(checked) => handleNotificationChange('scheduleChanges', checked)}
                  />
                </FormItem>

                <Separator />

                <FormItem className="flex items-center justify-between space-y-0 w-full">
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

        <TabsContent value="academic" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Configuration de l'année actuelle</CardTitle>
              <CardDescription>
                Sélectionnez l'année scolaire actuellement en cours pour votre établissement.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormItem className="w-full">
                <FormLabel>Année scolaire actuelle *</FormLabel>
                
                {isLoadingAcademicConfig || isLoadingEstablishmentInfo ? ( // Check both loading states if they affect this part
                  <div>Chargement des années scolaires...</div>
                ) : (
                  <Select
                    onValueChange={handleCurrentAcademicYearChange}
                    value={currentAcademicYearId ? String(currentAcademicYearId) : ""}
                  >
                    <SelectTrigger className="w-full md:w-1/2">
                      <SelectValue placeholder={getAcademicYearNameById(currentAcademicYearId)} />
                    </SelectTrigger>
                    <SelectContent>
                      {academicYearsList.map((year: any) => (
                        <SelectItem key={year.id} value={String(year.id)}>
                          {year.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <FormDescription>
                  Cette année sera utilisée par défaut pour les opérations du système.
                </FormDescription>
              </FormItem>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={saveSettings}>Enregistrer</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Paramètres de sécurité</CardTitle>
              <CardDescription>
                Configurez les options de sécurité pour votre établissement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-6 w-full">
                <FormItem className="flex items-center justify-between space-y-0 w-full">
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

                <FormItem className="flex items-center justify-between space-y-0 w-full">
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
                  <div className="ml-6 pl-6 border-l w-full">
                    <FormItem className="w-full">
                      <FormLabel>Délai avant verrouillage (minutes)</FormLabel>
                      <Input
                        type="number"
                        value={securitySettings.sessionTimeout}
                        onChange={(e) => handleSecurityChange('sessionTimeout', parseInt(e.target.value))}
                        min="5"
                        max="120"
                        className="w-full"
                      />
                    </FormItem>
                  </div>
                )}

                <Separator />

                <FormItem className="flex items-center justify-between space-y-0 w-full">
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