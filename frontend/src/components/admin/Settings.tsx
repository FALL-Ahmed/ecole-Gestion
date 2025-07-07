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
import { Eye, EyeOff, Mail, Phone} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function Settings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  const { t, language } = useLanguage();

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
  
  // Password change state
  const [ancienMotDePasse, setAncienMotDePasse] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState({ old: false, new: false, confirm: false });
  const { user } = useAuth();

  // Data for current academic year
  const [academicYearsList, setAcademicYearsList] = useState<any[]>([]);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState<number | null>(null);
  const [isLoadingAcademicConfig, setIsLoadingAcademicConfig] = useState(true);
  const [isLoadingEstablishmentInfo, setIsLoadingEstablishmentInfo] = useState(true);

  const { fetchEstablishmentInfo: fetchEstablishmentInfoContext } = useEstablishmentInfo();

  const getAcademicYearNameById = useCallback((id: number | null) => {
    if (id === null) {
      return t.settings.selectAcademicYear;
    }
    const numericId = typeof id === 'string' ? parseInt(id) : id;
    const year = academicYearsList.find((y: any) => y.id === numericId);

    if (year) {
      const startDate = new Date(year.date_debut);
      const endDate = new Date(year.date_fin);
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.error("Invalid dates for academic year:", year);
        return year.libelle || `${t.common.academicYears} ID ${id} (${t.common.invalidDate})`;
      }
      return `${year.libelle} (${format(startDate, 'yyyy')} - ${format(endDate, 'yyyy')})`;
    }
    return t.common.unknownYear;
  }, [academicYearsList, t]);

  const fetchAcademicYears = async () => {
    try {
      const response = await fetch(`${API_URL}/api/annees-academiques`);
      if (!response.ok) {
        throw new Error(t.settings.errorFetchingAcademicYears);
      }
      const data = await response.json();
      setAcademicYearsList(data);
    } catch (error: any) {
      console.error('Error fetching academic years:', error);
      toast({
        title: t.common.error,
        description: `${t.settings.errorLoadingAcademicYears}: ${error.message}.`,
        variant: "destructive",
      });
    }
  };

  const fetchEstablishmentInfo = async () => {
    setIsLoadingEstablishmentInfo(true);
    try {
      const response = await fetch(`${API_URL}/api/establishment-info`);
      if (!response.ok) {
        if (response.status === 404) {
          setAccountForm({ schoolName: "", directorName: "", email: "", phone: "", address: "", website: "" });
          toast({ 
            title: t.common.information, 
            description: t.settings.noEstablishmentInfoFound,
            variant: "default" 
          });
          return;
        }
        throw new Error(t.settings.errorFetchingEstablishmentInfo);
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
      toast({ 
        title: t.common.error, 
        description: `${t.settings.errorLoadingEstablishmentInfo}: ${error.message}.`, 
        variant: "destructive" 
      });
      setAccountForm({ schoolName: t.settings.errorLoading, directorName: "", email: "", phone: "", address: "", website: "" });
    } finally {
      setIsLoadingEstablishmentInfo(false);
    }
  };

  const fetchCurrentAcademicYearConfiguration = async () => {
    try {
      const response = await fetch(`${API_URL}/api/configuration`);
      if (!response.ok) {
        if (response.status === 404) {
          setCurrentAcademicYearId(null);
          return;
        }
        throw new Error(t.settings.errorFetchingCurrentYear);
      }
      const data = await response.json();
      setCurrentAcademicYearId(data.annee_scolaire?.id || null);
    } catch (error: any) {
      console.error('Error fetching current academic year configuration:', error);
      toast({
        title: t.common.error,
        description: `${t.settings.errorLoadingCurrentYear}: ${error.message}.`,
        variant: "destructive",
      });
      setCurrentAcademicYearId(null);
    }
  };

  useEffect(() => {
    const loadAcademicData = async () => {
      setIsLoadingAcademicConfig(true);
      await fetchAcademicYears();
      await fetchEstablishmentInfo();
    };
    loadAcademicData();
  }, []);

  useEffect(() => {
    if (academicYearsList.length > 0 || !isLoadingAcademicConfig) {
      fetchCurrentAcademicYearConfiguration().then(() => {
        setIsLoadingAcademicConfig(false);
      });
    } else if (academicYearsList.length === 0 && !isLoadingAcademicConfig) {
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
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ancienMotDePasse: ancienMotDePasse,
          nouveauMotDePasse: nouveauMotDePasse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t.settings.passwordChangeFailed);
      }

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
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const saveSettings = async () => {
    let success = true;
    let description = `${t.settings.settingsSaved} ${getTabDescription(activeTab)} ${t.settings.haveBeenUpdated}.`;

    if (activeTab === 'account') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/establishment-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...accountForm,
            website: accountForm.website === "" ? null : accountForm.website,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t.settings.errorSavingEstablishmentInfo);
        }
        await fetchEstablishmentInfo();
        await fetchEstablishmentInfoContext();
      } catch (error: any) {
        console.error('Error saving establishment information:', error);
        description = `${t.settings.errorSavingEstablishmentInfo}: ${error.message}`;
        success = false;
      }
    } else if (activeTab === 'notifications') {
      description = t.settings.notificationsNotImplemented;
      success = false;
    } else if (activeTab === 'security') {
      // TODO: Implement saving security settings
    } else if (activeTab === 'academic') {
      if (currentAcademicYearId === null) {
        toast({
          title: t.settings.saveError,
          description: t.settings.selectYearBeforeSave,
          variant: "destructive",
        });
        return;
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/configuration`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            annee_scolaire_id: currentAcademicYearId
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t.settings.errorSavingAcademicYear);
        }

        await fetchCurrentAcademicYearConfiguration();
        description = t.settings.academicYearConfigured;

      } catch (error: any) {
        console.error('Error saving academic year configuration:', error);
        description = `${t.settings.errorSavingAcademicYear}: ${error.message}`;
        success = false;
      }
    }

    toast({
      title: success ? t.settings.settingsSaved : t.settings.saveError,
      description: description,
      variant: success ? "default" : "destructive",
    });
  };

  const getTabDescription = (tab: string) => {
    switch (tab) {
      case 'account': return t.settings.establishment;
      case 'notifications': return t.settings.notification;
      case 'academic': return t.settings.academicYear;
      case 'security': return t.settings.security;
      default: return "";
    }
  };

  const isRTL = language === 'ar';
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const flexDirection = isRTL ? 'flex-row-reverse' : 'flex-row';

  return (
    <div 
      className="p-6 w-full mx-auto"
      dir={textDirection}
    >
      <h1 className="text-2xl font-bold mb-6">{t.settings.title}</h1>

      <Tabs 
        defaultValue="account" 
        value={activeTab} 
        onValueChange={setActiveTab} 
        className="space-y-6 w-full"
        dir={textDirection}
      >
        <TabsList className={`flex ${flexDirection} flex-wrap w-full gap-2 sm:gap-4 justify-center mb-8`}>
          <TabsTrigger
            value="account"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.settings.establishment}
          </TabsTrigger>
       
          <TabsTrigger
            value="academic"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.settings.academicYear}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="flex-1 sm:flex-none border bg-gray-100 text-gray-800 shadow-md sm:border-0 sm:bg-transparent sm:text-inherit sm:shadow-none"
          >
            {t.settings.security}
          </TabsTrigger>
        </TabsList>
        <div className="h-4 sm:h-12"></div>

      <TabsContent value="account" className="w-full">
  <Card className="w-full">
    <CardHeader>
      <CardTitle>{t.settings.establishmentInfo}</CardTitle>
      <CardDescription>
        {t.settings.establishmentInfoDescription}
      </CardDescription>
    </CardHeader>

    <CardContent className="space-y-6">
      {/* Section Contacts Plateforme - Version garantie */}
     <div className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-md overflow-hidden transition-all hover:shadow-xl">
  {/* Header */}
  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 border-b border-gray-100 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-300 dark:to-blue-100">
          {t.settings.platformContacts}
        </span>
      </h3>
      <span className="text-xs font-medium bg-white dark:bg-gray-800/70 text-blue-600 dark:text-blue-200 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/40 shadow-sm">
        {t.settings.responseTime}
      </span>
    </div>
  </div>

  {/* Contact list */}
  <div className="divide-y divide-gray-100 dark:divide-gray-700">
    {/* Contact email */}
    <div
      className="group px-6 py-4 hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-all cursor-pointer"
      onClick={() => {
        navigator.clipboard.writeText("contact@edusynch.com");
        toast({
          title: t.settings.emailCopied,
          description: t.settings.emailCopiedDescription,
        });
      }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg ring-1 ring-inset ring-blue-200 dark:ring-blue-700 group-hover:scale-105 transition-transform">
          <Mail className="w-5 h-5 text-blue-600 dark:text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {t.settings.professionalEmail}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
            contact@test.com
          </p>
        </div>
      </div>
    </div>

    {/* Contact Maroc */}
    <a
      href="tel:+212700360608"
      className="block px-6 py-4 hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-all"
      onClick={(e) => {
        if (!confirm(t.settings.confirmCall.replace("{{number}}", "+212 700 360 608")))
          e.preventDefault();
      }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg ring-1 ring-inset ring-green-200 dark:ring-green-700 group-hover:scale-105 transition-transform">
          <Phone className="w-5 h-5 text-green-600 dark:text-green-300" />
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src="https://flagcdn.com/ma.svg"
            width="22"
            alt={t.settings.morocco}
            className="rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t.settings.supportMorocco}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">+212 700 360 608</p>
          </div>
        </div>
      </div>
    </a>

    {/* Contact Mauritanie */}
    <a
      href="tel:+22241513211"
      className="block px-6 py-4 hover:bg-green-50/40 dark:hover:bg-green-900/10 transition-all"
      onClick={(e) => {
        if (!confirm(t.settings.confirmCall.replace("{{number}}", "+222 41 07 03 18")))
          e.preventDefault();
      }}
    >
      <div className="flex items-center gap-4">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg ring-1 ring-inset ring-green-200 dark:ring-green-700 group-hover:scale-105 transition-transform">
          <Phone className="w-5 h-5 text-green-600 dark:text-green-300" />
        </div>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img
            src="https://flagcdn.com/mr.svg"
            width="22"
            alt={t.settings.mauritania}
            className="rounded-full border border-gray-300 dark:border-gray-600 shadow-sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {t.settings.supportMauritania}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">+222 41 07 03 18</p>
          </div>
        </div>
      </div>
    </a>
  </div>

  {/* Footer */}
  <div className="px-6 py-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-t border-gray-100 dark:border-gray-700">
    <p className="text-xs text-gray-600 dark:text-gray-300 text-center flex items-center justify-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {t.settings.assistance} <span className="font-medium text-blue-600 dark:text-blue-300">{t.settings.availableDays}</span> {t.settings.availableHours} (GMT)
    </p>
  </div>
</div>

      <Separator />

      {/* Formulaire Établissement */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <FormItem>
          <FormLabel>{t.settings.schoolName} *</FormLabel>
          <Input
            value={accountForm.schoolName}
            onChange={(e) => handleAccountChange('schoolName', e.target.value)}
            required
          />
        </FormItem>

        <FormItem>
          <FormLabel>{t.settings.directorName} *</FormLabel>
          <Input
            value={accountForm.directorName}
            onChange={(e) => handleAccountChange('directorName', e.target.value)}
            required
          />
        </FormItem>

        <FormItem>
          <FormLabel>{t.settings.contactEmail} *</FormLabel>
          <Input
            type="email"
            value={accountForm.email}
            onChange={(e) => handleAccountChange('email', e.target.value)}
            required
          />
        </FormItem>

        <FormItem>
          <FormLabel>{t.settings.phone} *</FormLabel>
          <Input
            value={accountForm.phone}
            onChange={(e) => handleAccountChange('phone', e.target.value)}
            required
          />
        </FormItem>

        <FormItem className="md:col-span-2">
          <FormLabel>{t.settings.address} *</FormLabel>
          <Input
            value={accountForm.address}
            onChange={(e) => handleAccountChange('address', e.target.value)}
            required
          />
        </FormItem>

        <FormItem className="md:col-span-2">
          <FormLabel>{t.settings.website}</FormLabel>
          <Input
            value={accountForm.website}
            onChange={(e) => handleAccountChange('website', e.target.value)}
            placeholder="https://www.example.com"
          />
        </FormItem>
      </div>
    </CardContent>

    <CardFooter className="flex justify-end gap-2">
      <Button onClick={saveSettings}>{t.common.save}</Button>
    </CardFooter>
  </Card>
</TabsContent>

        

        <TabsContent value="academic" className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t.settings.currentYearConfiguration}</CardTitle>
              <CardDescription>
                {t.settings.currentYearConfigurationDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormItem className="w-full">
                <FormLabel>{t.settings.currentAcademicYear} *</FormLabel>
                
                {isLoadingAcademicConfig || isLoadingEstablishmentInfo ? (
                  <div>{t.common.loading}</div>
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
                  {t.settings.currentYearUsageNote}
                </FormDescription>
              </FormItem>
            </CardContent>
            <CardFooter className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
              <Button onClick={saveSettings}>{t.common.save}</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="w-full">
  

  <Card className="w-full mt-6">
    <CardHeader className={isRTL ? "text-right" : "text-left"}>
      <CardTitle>{t.settings.changePassword}</CardTitle>
      <CardDescription>
        {t.settings.changePasswordDescription}
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <FormItem className={isRTL ? "text-right" : ""}>
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
            className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 h-7 w-7`} 
            onClick={() => setShowPassword(p => ({ ...p, old: !p.old }))}
          >
            {showPassword.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </FormItem>
      <FormItem className={isRTL ? "text-right" : ""}>
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
            className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 h-7 w-7`} 
            onClick={() => setShowPassword(p => ({ ...p, new: !p.new }))}
          >
            {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </FormItem>
      <FormItem className={isRTL ? "text-right" : ""}>
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
            className={`absolute ${isRTL ? 'left-1' : 'right-1'} top-1/2 -translate-y-1/2 h-7 w-7`} 
            onClick={() => setShowPassword(p => ({ ...p, confirm: !p.confirm }))}
          >
            {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </FormItem>
    </CardContent>
    <CardFooter className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
      <Button onClick={handlePasswordChange} disabled={isSavingPassword}>
        {isSavingPassword ? t.settings.changingPassword : t.settings.changePasswordButton}
      </Button>
    </CardFooter>
  </Card>
</TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;