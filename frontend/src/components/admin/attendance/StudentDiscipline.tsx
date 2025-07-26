import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, AlertTriangle, User, Save, Users, ChevronDown, ChevronUp, Mail, Calendar as CalendarIcon, MoreVertical, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

interface AnneeAcademique {
  id: number;
  libelle: string;
}

interface Classe {
  id: number;
  nom: string;
  annee_scolaire_id: number;
}

interface Student {
  id: number;
  nom: string;
  prenom: string;
  tuteurNom?: string | null;
  tuteurTelephone?: string | null;
}

interface Inscription {
  id: number;
  utilisateur: Student;
  classe: Classe;
}

interface DisciplinaryRecord {
  id: number;
  student: {
    id: number;
    nom: string;
    prenom: string;
  };
  class: {
    id: number;
    nom: string;
  };
  schoolYear: {
    id: number;
    libelle: string;
  };
  reason: string;
  date: string;
}

const schoolMonths = [
    { value: 9, label: 'Octobre' },
  { value: 10, label: 'Novembre' },
  { value: 11, label: 'Décembre' },
  { value: 0, label: 'Janvier' },
  { value: 1, label: 'Février' },
  { value: 2, label: 'Mars' },
  { value: 3, label: 'Avril' },
  { value: 4, label: 'Mai' },
  { value: 5, label: 'Juin' },
];

const arabicSchoolMonths = [
  "أكتوبر",   // octobre
  "نوفمبر",   // novembre
  "ديسمبر",   // décembre
  "يناير",    // janvier
  "فبراير",   // février
  "مارس",     // mars
  "أبريل",    // avril
  "مايو",     // mai
  "يونيو"     // juin
];


export function DisciplinaryManagement() {
const { t, language } = useLanguage(); // Assurez-vous que votre contexte expose `language`
const dateFnsLocale = language === 'ar' ? ar : fr;
const isRTL = language === 'ar';

  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
   const [selectedSchoolYearId, setSelectedSchoolYearId] = useState("");
 const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
 const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reason, setReason] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [sanctionDate, setSanctionDate] = useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const fetchData = async (url: string) => {
    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      return text ? JSON.parse(text) : [];
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      sonnerToast.error((error as Error).message);
      return [];
    }
  };

  const sendNotificationToTutor = async (student: Student, reason: string) => {
    if (!student.tuteurTelephone || student.tuteurTelephone === t.common.notProvided) {
      sonnerToast.warning(t.disciplinary.noPhoneWarning);
      return false;
    }

    setIsSendingNotification(true);
    try {
      const phoneNumber = student.tuteurTelephone.replace(/\D/g, '');
      
      const response = await fetch(`${API_BASE_URL}/send-whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          to: phoneNumber,
          tutorName: student.tuteurNom,
          studentName: `${student.prenom} ${student.nom}`,
          reason,
          schoolName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t.disciplinary.whatsappError);
      }

      sonnerToast.success(`${t.disciplinary.notificationSentTo} ${student.tuteurNom}`);
      return true;
    } catch (error) {
      console.error('WhatsApp Notification Error:', error);
      sonnerToast.error(error.message || t.disciplinary.whatsappError);
      return false;
    } finally {
      setIsSendingNotification(false);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [yearsData, configResponse] = await Promise.all([
          fetchData(`${API_BASE_URL}/annees-academiques`),
          fetch(`${API_BASE_URL}/configuration`)
        ]);
        
        if (!yearsData.length) {
          sonnerToast.warning(t.disciplinary.errorLoadYears);
        }
        
        setAnneesAcademiques(yearsData);
        if (configResponse.ok) {
          const configData = await configResponse.json();
          if (configData?.annee_scolaire?.id) {
            setSelectedSchoolYearId(configData.annee_scolaire.id.toString());
          }
          if (configData?.nom_etablissement) {
            setSchoolName(configData.nom_etablissement);
          }
        }
      } catch (error) {
        sonnerToast.error(t.disciplinary.errorLoadYears);
      }
    };
    fetchInitialData();
  }, [t]);

  useEffect(() => {
    if (selectedSchoolYearId) {
      const fetchClasses = async () => {
        try {
          const allClasses = await fetchData(`${API_BASE_URL}/classes?annee_scolaire_id=${selectedSchoolYearId}`);
          const filteredClasses = allClasses.filter((c: Classe) => c.annee_scolaire_id === parseInt(selectedSchoolYearId, 10));
          
          if (!filteredClasses.length) {
            sonnerToast.warning(t.disciplinary.noClasses);
          }
          
          setClasses(filteredClasses);
        } catch (error) {
          sonnerToast.error(t.disciplinary.errorLoadClasses);
        }
      };
      fetchClasses();
    }
  }, [selectedSchoolYearId, t]);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]);
      setRecords([]);
      return;
    }

    const fetchStudentsAndRecords = async () => {
      setIsLoading(true);
      try {
        const [inscriptions, disciplinaryRecords] = await Promise.all([
          fetchData(`${API_BASE_URL}/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedSchoolYearId}`),
          fetchData(`${API_BASE_URL}/disciplinary-records/class/${selectedClassId}`)
        ]);
        
        const studentsWithTutors = await Promise.all(
          inscriptions.map(async (insc: Inscription) => {
            try {
              const fullStudentData = await fetchData(`${API_BASE_URL}/users/${insc.utilisateur.id}`);
              return {
                ...insc.utilisateur,
                tuteurNom: fullStudentData?.tuteurNom || t.common.notProvided,
                tuteurTelephone: fullStudentData?.tuteurTelephone || t.common.notProvided
              };
            } catch (error) {
              console.error(`Error fetching tutor data for student ${insc.utilisateur.id}:`, error);
              return {
                ...insc.utilisateur,
                tuteurNom: t.common.loadError,
                tuteurTelephone: t.common.loadError
              };
            }
          })
        );

        if (!studentsWithTutors.length) {
          sonnerToast.warning(t.disciplinary.noStudents);
        }

        setStudents(studentsWithTutors);
        setRecords(disciplinaryRecords);
      } catch (error) {
        console.error("Error fetching data:", error);
        sonnerToast.error(t.disciplinary.errorLoadStudents);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStudentsAndRecords();
  }, [selectedClassId, selectedSchoolYearId, t]);

  const handleOpenModal = (student: Student) => {
    setSelectedStudent(student);
    setReason('');
    setIsModalOpen(true);
        setSanctionDate(new Date());

  };

  const toggleStudentExpansion = (studentId: number) => {
    setExpandedStudentId(expandedStudentId === studentId ? null : studentId);
  };

  const handleSave = async () => {
    if (!selectedStudent || !reason.trim() || !selectedClassId || !sanctionDate) {
      sonnerToast.error(t.disciplinary.errorForm);
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        studentId: selectedStudent.id,
        classId: parseInt(selectedClassId),
        schoolYearId: parseInt(selectedSchoolYearId),
        reason: reason,
        date: format(sanctionDate, 'yyyy-MM-dd'),
      };

      const [saveResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/disciplinary-records`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }),
        //sendNotificationToTutor(selectedStudent, reason)
      ]);

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(errorData.message || t.disciplinary.errorSave);
      }

      sonnerToast.success(t.disciplinary.successSave);
      setIsModalOpen(false);
      setSelectedStudent(null);
      setReason('');

      // Refresh data
      const [updatedRecords, updatedInscriptions] = await Promise.all([
        fetchData(`${API_BASE_URL}/disciplinary-records/class/${selectedClassId}`),
        fetchData(`${API_BASE_URL}/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${selectedSchoolYearId}`)
      ]);
      
      const studentsWithTutor = await Promise.all(
        updatedInscriptions.map(async (insc: Inscription) => {
          const studentDetails = await fetchData(`${API_BASE_URL}/users/${insc.utilisateur.id}`);
          return {
            ...insc.utilisateur,
            tuteurNom: studentDetails.tuteurNom || t.common.notProvided,
            tuteurTelephone: studentDetails.tuteurTelephone || t.common.notProvided
          };
        })
      );

      setStudents(studentsWithTutor);
      setRecords(updatedRecords);
    } catch (error) {
      sonnerToast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const activeYear = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
     <div>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            {t.disciplinary.title}
          </CardTitle>
          <CardDescription>{t.disciplinary.description}</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Filtres */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>{t.common.schoolYear}</Label>
              <Input 
                value={activeYear?.libelle || t.disciplinary.errorNoYear} 
                disabled 
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
  <Label htmlFor="month-select">{t.common.month}</Label>
  <Select 
    onValueChange={(value) => setSelectedMonth(parseInt(value))} 
    defaultValue={new Date().getMonth().toString()}
  >
    <SelectTrigger id="month-select" className="w-full">
      <SelectValue placeholder={t.common.selectAMonth} />
    </SelectTrigger>
    <SelectContent>
      {schoolMonths.map((month, index) => (
        <SelectItem key={month.value} value={month.value.toString()}>
          {language === 'ar' ? arabicSchoolMonths[index] : month.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
            <div className="space-y-2">
              <Label htmlFor="class-select">{t.common.class}</Label>
              <Select 
                onValueChange={setSelectedClassId} 
                value={selectedClassId} 
                disabled={!selectedSchoolYearId}
              >
                <SelectTrigger id="class-select" className="w-full">
                  <SelectValue placeholder={t.common.selectAClass} />
                </SelectTrigger>
                <SelectContent>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id.toString()}>
                        {cls.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-2 text-sm text-muted-foreground">
                      {t.disciplinary.noClasses}
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
                        

          </div>

          {/* Contenu principal */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <span className="ml-2">Chargement...</span>
            </div>
          ) : selectedClassId ? (
            <Card className="overflow-hidden">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t.disciplinary.studentList}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className={cn("min-w-full", isRTL && "force-ltr")}>
  <TableHeader className="bg-muted/50">
    <TableRow>
      <TableHead className="min-w-[180px] text-left">
        <div className="flex items-center">
          <User className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {t.common.student}
        </div>
      </TableHead>
      
      <TableHead className="hidden lg:table-cell text-left">
        <div className="flex items-center">
          <User className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {t.disciplinary.tutor}
        </div>
      </TableHead>
      
      <TableHead className="hidden lg:table-cell text-left">
        <div className="flex items-center">
          <Phone className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {t.common.tutorPhone}
        </div>
      </TableHead>
      
      <TableHead className="text-left">
        <div className="flex items-center">
          <AlertTriangle className={cn("h-4 w-4", isRTL ? "ml-1" : "mr-1")} />
          {t.disciplinary.records}
        </div>
      </TableHead>
      
      <TableHead className="text-right">
        <div className="flex items-center justify-end">
          {t.common.actions}
          <MoreVertical className={cn("h-4 w-4", isRTL ? "mr-1" : "ml-1")} />
        </div>
      </TableHead>
    </TableRow>
  </TableHeader>
                    
                    <TableBody>
                      {students.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            {t.disciplinary.noStudents}
                          </TableCell>
                        </TableRow>
                      ) : (
                        students.map(student => {
                          const studentAllRecords = records.filter(r => r.student.id === student.id);
                          const studentMonthlyRecords = studentAllRecords.filter(r => new Date(r.date).getMonth() === selectedMonth);
                          const incidentsThisMonth = studentMonthlyRecords.length;
                          const hasTooManyIncidents = incidentsThisMonth >= 5;
                          const hasRecordsThisMonth = studentMonthlyRecords.length > 0;
                          
                          return (
                            <React.Fragment key={student.id}>
                              <TableRow 
                                className={cn(
                                  hasRecordsThisMonth && 'cursor-pointer hover:bg-muted/30',
                                  hasTooManyIncidents && 'bg-red-100 dark:bg-red-900/20'
                                )}
                                onClick={() => hasRecordsThisMonth && toggleStudentExpansion(student.id)}
                              >
                                <TableCell className={cn("font-medium", hasTooManyIncidents && "text-red-900 dark:text-red-100 font-bold")}>
                                  <div className="flex items-center">
                                    {hasRecordsThisMonth && (
                                      expandedStudentId === student.id ? (
                                        <ChevronUp className="h-4 w-4 mr-1" />
                                      ) : (
                                        <ChevronDown className="h-4 w-4 mr-1" />
                                      )
                                    )}
                                    <div className="flex flex-col">
                                      <span>{student.prenom} {student.nom}</span>
                                      <span className="text-xs text-muted-foreground lg:hidden">
                                        {student.tuteurNom || 'N/A'} • {student.tuteurTelephone || 'N/A'}
                                      </span>
                                    </div>
                                  </div>
                                </TableCell>
                                
                                <TableCell className="hidden lg:table-cell">
                                  {student.tuteurNom || 'N/A'}
                                </TableCell>
                                
                                <TableCell className="hidden lg:table-cell">
                                  {student.tuteurTelephone || 'N/A'}
                                </TableCell>
                                
                                <TableCell>
                                  {incidentsThisMonth > 0 ? (
                                    <span className={cn(
                                        "font-semibold",
                                        hasTooManyIncidents ? "text-red-600 dark:text-red-400" : "text-primary"
                                    )}>
                                      {incidentsThisMonth} {t.disciplinary.recordsCount}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">
                                      {t.disciplinary.noRecordsThisMonth || 'Aucun incident ce mois-ci'}
                                    </span>
                                  )}
                                </TableCell>
                                
                                <TableCell className="text-right">
                                  <Button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenModal(student);
                                    }} 
                                    variant="destructive" 
                                    size="sm"
                                    className="gap-1"
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                    <span className="hidden sm:inline">{t.disciplinary.reportButton}</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                              
                              {expandedStudentId === student.id && hasRecordsThisMonth && (
                                <TableRow className="bg-muted/10">
                                  <TableCell colSpan={5}>
                                    <div className="p-4 space-y-2">
                                      {studentMonthlyRecords.map(record => (
                                        <div 
                                          key={record.id} 
                                          className="p-3 rounded-md bg-background border"
                                        >
                                          <div className="flex justify-between items-start">
                                            <div>
                                              <p className="font-medium">{formatDate(record.date)}</p>
                                              <p className="text-sm text-muted-foreground">
                                                {record.reason}
                                              </p>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t.disciplinary.selectClassPrompt}
            </div>
          )}

          {/* Modal d'ajout de sanction */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="sm:max-w-[600px] max-w-[95vw]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t.disciplinary.reportFor} {selectedStudent?.prenom} {selectedStudent?.nom}
                </DialogTitle>
                <DialogDescription asChild>
                  <div>
                    {selectedStudent?.tuteurNom && (
                      <div className="mb-2 space-y-1">
                        <p><strong>{t.disciplinary.tutor}:</strong> {selectedStudent.tuteurNom}</p>
                        {selectedStudent.tuteurTelephone && (
                          <p><strong>{t.common.tutorPhone}:</strong> {selectedStudent.tuteurTelephone}</p>
                        )}
                      </div>
                    )}
                    {t.disciplinary.modalDescription}
                  </div>
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sanction-date">{t.common.date}</Label>
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="sanction-date"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !sanctionDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {sanctionDate ? format(sanctionDate, "PPP", { locale: dateFnsLocale }) : <span>{t.common.selectDate}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={sanctionDate}
                        onSelect={(date) => {
                          if (date) {
                            setSanctionDate(date);
                            setIsDatePickerOpen(false);
                          }
                        }}
                        initialFocus
                        locale={dateFnsLocale}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reason">{t.disciplinary.reasonLabel}</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder={t.disciplinary.reasonPlaceholder}
                    rows={5}
                    className="min-h-[120px]"
                  />
                </div>
                
                {selectedStudent?.tuteurTelephone && selectedStudent.tuteurTelephone !== t.common.notProvided && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                    <Mail className="h-4 w-4 text-blue-500" />
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {t.disciplinary.notificationWillBeSent}
                    </p>
                  </div>
                )}
              </div>
              
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {t.common.cancel}
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || !reason.trim()}
                  className="gap-1 w-full sm:w-auto"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

export default DisciplinaryManagement;