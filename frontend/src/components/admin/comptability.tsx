import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { fr, arSA } from 'date-fns/locale';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Calendar, School, Search, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { PaymentForm } from '../PaymentForm';
import apiClient from '@/lib/apiClient';

// Types
interface AnneeScolaire {
  id: number;
  libelle: string;
}

interface Classe {
  id: number;
  nom: string;
  frais_scolarite: number;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  classeId?: number;
  classeNom?: string;
  fraisScolarite?: number;
  tuteurNom?: string;
  tuteurTelephone?: string;
}

interface Paiement extends PaiementResponse {
  resteAPayer?: number;
  eleve?: {
    nom: string;
    prenom: string;
  };
  classe?: {
    id: number;
    nom: string;
  };
}

interface InscriptionResponse {
  utilisateur: {
    id: number;
    nom: string;
    prenom: string;
    role: string;
  };
  classe: {
    id: number;
    nom: string;
    frais_scolarite: number;
  };
}

interface PaiementResponse {
  id: number;
  eleveId: number;
  anneeScolaireId: number;
  mois: string;
  montantAttendu: number;
  montantPaye: number;
  statut: 'Non Payé' | 'Partiel' | 'Payé';
  dateDernierPaiement: string | null;
}

export function AccountingManagement() {
  const { t, language } = useLanguage();
  const [anneesScolaires, setAnneesScolaires] = useState<AnneeScolaire[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [selectedAnneeId, setSelectedAnneeId] = useState<string>('');
  const [selectedClasseId, setSelectedClasseId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentPayment, setCurrentPayment] = useState<Paiement | null>(null);
  const [reminderLoading, setReminderLoading] = useState<{ [key: string]: boolean }>({});
  const [remindersSent, setRemindersSent] = useState<{ [key: string]: boolean }>({});
  const [currentDate, setCurrentDate] = useState('');
  const [isLoading, setIsLoading] = useState({
    annees: false,
    classes: false,
    eleves: false,
    paiements: false
  });

  useEffect(() => {
    const today = new Date();
    const locale = language === 'ar' ? arSA : fr;
    const formattedDate = format(today, 'EEEE, d MMMM yyyy', { locale });
    setCurrentDate(formattedDate);

    const savedReminders = localStorage.getItem('remindersSent');
    if (savedReminders) {
      setRemindersSent(JSON.parse(savedReminders));
    }
  }, [language]);

  const handleSendReminder = async (eleveId: number, mois: string, statut: string) => {
    try {
      setReminderLoading(prev => ({ ...prev, [`${eleveId}-${mois}`]: true }));
      const eleve = eleves.find(e => e.id === eleveId);
      if (!eleve) {
        toast({
          title: t.common.error,
          description: t.accounting.errors.studentNotFound,
          variant: "destructive"
        });
        return;
      }
      
      await apiClient.get(`/paiements/envoyer-rappel?eleveId=${eleveId}&mois=${mois}`);
      
      toast({
        title: t.common.success,
        description: `${t.accounting.notificationSent} ${eleve.prenom} ${eleve.nom}`,
        variant: "default"
      });

      if (statut === 'Payé') {
        const updatedReminders = { ...remindersSent, [`${eleveId}-${mois}`]: true };
        setRemindersSent(updatedReminders);
        localStorage.setItem('remindersSent', JSON.stringify(updatedReminders));
      }
    } catch (error) {
      let errorMessage = t.accounting.errors.sendNotificationFailed;
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      toast({
        title: t.common.error,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setReminderLoading(prev => ({ ...prev, [`${eleveId}-${mois}`]: false }));
    }
  };

  const MOIS_SCOLAIRES_KEYS = useMemo(() => [
    'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février',
    'Mars', 'Avril', 'Mai', 'Juin'
  ], []);

  const moisScolaires = useMemo(() =>
    MOIS_SCOLAIRES_KEYS.map(key => ({
      key: key,
      display: t.months[key as keyof typeof t.months] || key
    })), [MOIS_SCOLAIRES_KEYS, t]);

  useEffect(() => {
    const fetchAnnees = async () => {
      setIsLoading(prev => ({ ...prev, annees: true }));
      try {
        const { data } = await apiClient.get('/annees-academiques');
        setAnneesScolaires(data);
      } catch (error) {
        console.error("Error fetching academic years:", error);
        toast({
          title: t.common.error,
          description: t.accounting.errors.loadYears,
          variant: "destructive"
        });
      } finally {
        setIsLoading(prev => ({ ...prev, annees: false }));
      }
    };
    fetchAnnees();
  }, [t]);

  useEffect(() => {
    const fetchClasses = async () => {
      if (!selectedAnneeId) {
        setClasses([]);
        setSelectedClasseId('');
        return;
      }
      setIsLoading(prev => ({ ...prev, classes: true }));
      try {
        const { data } = await apiClient.get(`/classes?anneeScolaireId=${selectedAnneeId}`);
        setClasses(data);
      } catch (error) {
        console.error("Error fetching classes:", error);
        toast({
          title: t.common.error,
          description: t.accounting.errors.loadClasses,
          variant: "destructive"
        });
      } finally {
        setIsLoading(prev => ({ ...prev, classes: false }));
      }
    };
    fetchClasses();
  }, [selectedAnneeId, t]);

  const fetchStudentsAndPayments = useCallback(async () => {
    if (!selectedClasseId || !selectedAnneeId) {
      setEleves([]);
      setPaiements([]);
      return;
    }
    setIsLoading(prev => ({ ...prev, eleves: true, paiements: true }));
    try {
      const inscriptionsRes = await apiClient.get(
        `/inscriptions?classeId=${selectedClasseId}&anneeScolaireId=${selectedAnneeId}`
      );
      
      const formattedElevesPromises = Array.isArray(inscriptionsRes.data)
        ? inscriptionsRes.data.map(async (ins: InscriptionResponse) => {
          const { data: userDetails } = await apiClient.get(`/users/${ins.utilisateur.id}`);
          return {
            id: ins.utilisateur.id,
            nom: ins.utilisateur.nom,
            prenom: ins.utilisateur.prenom,
            classeId: ins.classe.id,
            classeNom: ins.classe.nom,
            fraisScolarite: ins.classe.frais_scolarite,
            tuteurNom: userDetails.tuteurNom || null,
            tuteurTelephone: userDetails.tuteurTelephone || null
          };
        })
        : [];
      
      const formattedEleves = await Promise.all(formattedElevesPromises);
      setEleves(formattedEleves);
      
      if (formattedEleves.length > 0) {
        try {
          const paiementsRes = await apiClient.get(
            `/paiements?classeId=${selectedClasseId}&anneeScolaireId=${selectedAnneeId}`
          );
          
          const formattedPaiements: Paiement[] = Array.isArray(paiementsRes.data)
            ? paiementsRes.data.map((p: PaiementResponse) => ({
              ...p,
              resteAPayer: Math.max(0, p.montantAttendu - p.montantPaye),
              eleve: formattedEleves.find(e => e.id === p.eleveId),
              classe: {
                id: formattedEleves.find(e => e.id === p.eleveId)?.classeId || 0,
                nom: formattedEleves.find(e => e.id === p.eleveId)?.classeNom || '',
              }
            }))
            : [];
          setPaiements(formattedPaiements);
        } catch (paiementsError) {
          console.error("Could not fetch payments:", paiementsError);
          setPaiements([]);
        }
      } else {
        setPaiements([]);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast({ 
        title: t.common.error, 
        description: t.accounting.errors.loadStudents, 
        variant: "destructive" 
      });
      setEleves([]);
    } finally {
      setIsLoading(prev => ({ ...prev, eleves: false, paiements: false }));
    }
  }, [selectedClasseId, selectedAnneeId, t]);

  useEffect(() => {
    fetchStudentsAndPayments();
  }, [fetchStudentsAndPayments]);

  const handleOpenForm = (paiement?: Paiement, eleveId?: number, mois?: string) => {
    if (paiement) {
      const eleve = eleves.find(e => e.id === paiement.eleveId);
      setCurrentPayment({
        ...paiement,
        eleve: eleve ? {
          nom: eleve.nom,
          prenom: eleve.prenom
        } : undefined,
        classe: {
          id: eleve?.classeId || 0,
          nom: eleve?.classeNom || '',
        }
      });
    } else if (eleveId && mois) {
      const eleve = eleves.find(e => e.id === eleveId);
      setCurrentPayment({
        id: 0,
        eleveId: eleveId,
        anneeScolaireId: parseInt(selectedAnneeId),
        mois: mois,
        montantAttendu: eleve?.fraisScolarite || 0,
        montantPaye: 0,
        statut: 'Non Payé',
        dateDernierPaiement: null,
        eleve: eleve ? {
          nom: eleve.nom,
          prenom: eleve.prenom
        } : undefined,
        classe: {
          id: eleve?.classeId || 0,
          nom: eleve?.classeNom || '',
        }
      });
    }
    setIsFormOpen(true);
  };

  const handleSavePayment = async (formData: any) => {
    try {
      const payload = {
        eleveId: formData.eleveId,
        anneeScolaireId: parseInt(selectedAnneeId),
        mois: formData.mois,
        montantVerse: parseFloat(String(formData.montantPaye)) || 0,
        montantOfficiel: parseFloat(String(formData.montantAttendu)) || 0,
      };
      
      if (formData.id === 0) {
        await apiClient.post('/paiements/enregistrer', payload);
      } else {
        await apiClient.put(`/paiements/${formData.id}`, payload);
      }
      
      toast({
        title: t.common.success,
        description: t.accounting.success.paymentUpdated
      });
      setIsFormOpen(false);
      fetchStudentsAndPayments();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        title: t.common.error,
        description: t.accounting.errors.updatePayment,
        variant: "destructive"
      });
    }
  };

  const filteredEleves = useMemo(() => {
    return eleves.filter(e =>
      `${e.prenom} ${e.nom}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [eleves, searchQuery]);

  const selectedClasse = useMemo(() => classes.find(c => c.id === parseInt(selectedClasseId)), [classes, selectedClasseId]);

  const getStatusBadge = (statut: string) => {
    switch (statut) {
      case 'Payé':
        return <Badge className="bg-green-500 text-white px-2 py-1 rounded hover:scale-110 transition-transform dark:bg-green-700">{t.accounting.status.paid}</Badge>;
      case 'Partiel':
        return <Badge className="bg-yellow-500 text-white px-2 py-1 rounded hover:scale-110 transition-transform dark:bg-yellow-700">{t.accounting.status.partial}</Badge>;
      default:
        return <Badge className="bg-red-500 text-white px-2 py-1 rounded hover:scale-110 transition-transform dark:bg-red-700">{t.accounting.status.unpaid}</Badge>;
    }
  };

  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <div className="p-4 md:p-6 space-y-6 dark:bg-gray-900 dark:text-white">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center mb-6"
        >
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span>{t.sidebar?.accounting || "Comptabilité"}</span>
          </h1>
          <div className="flex items-center text-lg font-medium bg-blue-50 dark:bg-blue-900 px-4 py-2 rounded-lg shadow-sm border border-blue-100 dark:border-blue-800">
            <Calendar className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            <span>{currentDate}</span>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">{t.accounting.filters.title}</CardTitle>
              <CardDescription className="dark:text-gray-400">{t.accounting.filters.description}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select onValueChange={setSelectedAnneeId} value={selectedAnneeId}>
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t.accounting.filters.selectYear} />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  {isLoading.annees ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    anneesScolaires.map(a => (
                      <SelectItem key={a.id} value={String(a.id)}>{a.libelle}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Select
                onValueChange={setSelectedClasseId}
                value={selectedClasseId}
                disabled={!selectedAnneeId || isLoading.classes}
              >
                <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white">
                  <School className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t.accounting.filters.selectClass} />
                </SelectTrigger>
                <SelectContent className="dark:bg-gray-700 dark:text-white">
                  {isLoading.classes ? (
                    <div className="flex justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    classes.map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input
                  placeholder={t.accounting.filters.searchStudent}
                  className="pl-10 w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  disabled={!selectedClasseId}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <AnimatePresence>
          {selectedClasseId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <Card className="shadow-md dark:bg-gray-800 dark:border-gray-700">
                <CardHeader>
                  <CardTitle className="dark:text-white">{t.accounting.paymentTracking}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {isLoading.eleves || isLoading.paiements ? (
                    <div className="flex justify-center items-center h-64">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-full overflow-x-auto">
                      <Table className="w-full">
                        <TableHeader className="bg-gray-50 dark:bg-gray-700">
                          <TableRow>
                            <TableHead className="sticky left-0 bg-gray-50 dark:bg-gray-700 w-48 min-w-[192px] font-semibold dark:text-white">
                              {t.common.student}
                            </TableHead>
                            {moisScolaires.map((mois) => (
                              <TableHead key={mois.key} className="text-center font-semibold p-2 dark:text-white">
                                {mois.display}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredEleves.length > 0 ? (
                            filteredEleves.map((eleve, index) => (
                              <motion.tr
                                key={eleve.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                <TableCell className="sticky left-0 bg-white dark:bg-gray-800 font-medium whitespace-nowrap w-48 min-w-[192px] dark:text-white">
                                  {`${eleve.prenom} ${eleve.nom}`}
                                </TableCell>
                                {moisScolaires.map(({ key: mois }) => {
                                  const paiement = paiements.find(p => p.eleveId === eleve.id && p.mois === mois);
                                  const isLoadingReminder = reminderLoading[`${eleve.id}-${mois}`];
                                  const isReminderSent = remindersSent[`${eleve.id}-${mois}`];
                                  return (
                                    <TableCell key={mois} className="text-center p-2">
                                      <div className="flex flex-col items-center justify-center gap-1">
                                        <div className="cursor-pointer" onClick={() => handleOpenForm(paiement, eleve.id, mois)}>
                                          {getStatusBadge(paiement?.statut || 'Non Payé')}
                                        </div>
                                        {eleve.tuteurTelephone && !isReminderSent && (
                                          <motion.div whileHover={{ scale: 1.1 }}>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="text-xs h-8 w-8 p-0 hover:bg-yellow-50 dark:hover:bg-gray-600 rounded-full"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSendReminder(eleve.id, mois, paiement?.statut || 'Non Payé');
                                              }}
                                              disabled={isLoadingReminder}
                                            >
                                              {isLoadingReminder ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                              ) : (
                                                <Bell className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                                              )}
                                            </Button>
                                          </motion.div>
                                        )}
                                      </div>
                                    </TableCell>
                                  );
                                })}
                              </motion.tr>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={moisScolaires.length + 1} className="text-center py-8 dark:text-gray-400">
                                {searchQuery ? t.accounting.noStudentsFound : t.accounting.noStudentsInClass}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
        
        <DialogContent className="dark:bg-gray-800 dark:text-white">
          {currentPayment && (
            <PaymentForm
              payment={currentPayment}
              students={eleves}
              fraisScolariteClasse={selectedClasse?.frais_scolarite}
              months={moisScolaires}
              onSave={handleSavePayment}
              onCancel={() => setIsFormOpen(false)}
              translations={{
                ...t.accounting.form,
                ...t.common
              }}
            />
          )}
        </DialogContent>
      </div>
    </Dialog>
  );
}