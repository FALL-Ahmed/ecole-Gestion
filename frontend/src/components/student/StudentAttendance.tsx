import React, { useState, useEffect, useCallback } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import {
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Percent,
} from 'lucide-react';import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Trimestre {
  id: number;
  nom: string;
  date_debut: string;
  date_fin: string;
}

interface AbsenceAPI {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  justifie: boolean;
  justification: string;
  matiere?: { id: number; nom: string };
}

interface AbsenceRecord {
  id: number;
  date: string;
  dayOfWeek: string;
  subject: string;
  period: string;
  justified: boolean;
  justification: string;
}

interface AttendanceStats {
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
}

const initialAttendanceStats: AttendanceStats = {
  totalAbsences: 0,
  justifiedAbsences: 0,
  unjustifiedAbsences: 0,
};

interface StudentAttendanceProps {
  userId?: number;
}

export function StudentAttendance({ userId }: StudentAttendanceProps) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const { t, language } = useLanguage();

  const [activeSchoolYear, setActiveSchoolYear] = useState<AnneeAcademique | null>(null);
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('full-year');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [notifiedAbsenceIds, setNotifiedAbsenceIds] = useState<Set<number>>(new Set());
  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [currentAttendanceStats, setCurrentAttendanceStats] = useState<AttendanceStats>(initialAttendanceStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentId = userId ?? user?.id;

  const dateLocale = language === 'ar' ? ar : fr;
  const isRTL = language === 'ar';

  const translateSubject = useCallback((subjectName: string): string => {
    if (!subjectName) return t.common.unknownSubject;

    const subjectMap: { [key: string]: string } = {
      'Mathématiques': t.schedule.subjects.math,
      'Physique Chimie': t.schedule.subjects.physics,
      'Arabe': t.schedule.subjects.arabic,
      'Français': t.schedule.subjects.french,
      'Anglais': t.schedule.subjects.english,
      'Éducation Islamique': t.schedule.subjects.islamic,
      'Histoire Géographie': t.schedule.subjects.history,
      'Éducation Civique': t.schedule.subjects.civics,
      'Éducation Physique et Sportive': t.schedule.subjects.sport,
      'Philosophie': t.schedule.subjects.philosophy,
      'Sciences Naturelles': t.schedule.subjects.naturalSciences,
      'Technologie/Informatique': t.schedule.subjects.technology,
    };
    return subjectMap[subjectName] || subjectName;
  }, [t]);

  const justificationRate =
    currentAttendanceStats.totalAbsences > 0
      ? (currentAttendanceStats.justifiedAbsences /
          currentAttendanceStats.totalAbsences) *
        100
      : 0;

  useEffect(() => {
    const term = trimestres.find(t => t.id.toString() === selectedTermId);

    if (term) {
      setStartDate(new Date(term.date_debut));
      setEndDate(new Date(term.date_fin));
    } else if (activeSchoolYear) {
      setStartDate(new Date(activeSchoolYear.date_debut));
      setEndDate(new Date(activeSchoolYear.date_fin));
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  }, [selectedTermId, activeSchoolYear, trimestres]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        if (!configRes.ok) throw new Error(t.common.errorLoadingConfig);
        const configData: any | any[] = await configRes.json();
        let activeYearId: number | null = null;

        if (Array.isArray(configData) && configData.length > 0) {
          // Gère la réponse sous forme de tableau
          activeYearId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          // Gère la réponse sous forme d'objet simple
          activeYearId = (configData as any).annee_academique_active_id || (configData as any).annee_scolaire?.id;
        }
        
        if (!activeYearId) {
          throw new Error(t.common.missingYearConfig);
        }

        const [yearsRes, trimestresRes] = await Promise.all([
          fetch(`${API_BASE_URL}/annees-academiques`),
          fetch(`${API_BASE_URL}/trimestres?anneeScolaireId=${activeYearId}`)
        ]);

        if (!yearsRes.ok) throw new Error(t.common.errorLoadingYear);
        const allYears: AnneeAcademique[] = await yearsRes.json();

        const currentActiveYear = allYears.find(y => y.id === activeYearId);
        if (!currentActiveYear) {
          throw new Error(t.common.activeYearNotFound);
        }
        setActiveSchoolYear(currentActiveYear);

        if (!trimestresRes.ok) throw new Error(t.common.errorLoadingData('trimestres', ''));
        const trimestresData: Trimestre[] = await trimestresRes.json();
        setTrimestres(trimestresData);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : t.common.errorLoadingInitialData;
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [t]);

  useEffect(() => {
    const yearId = activeSchoolYear?.id;

    if (!studentId || !yearId || !startDate || !endDate) {
      setAbsenceRecords([]);
      setCurrentAttendanceStats(initialAttendanceStats);
      setIsLoading(false);
      return;
    }

    const storageKey = `notified_absence_ids_${studentId}`;
    const storedNotifiedIds = localStorage.getItem(storageKey);
    let initialNotifiedIdsFromStorage = new Set<number>();
    
    if (storedNotifiedIds) {
      try {
        initialNotifiedIdsFromStorage = new Set(JSON.parse(storedNotifiedIds).map(Number));
      } catch (e) {
        console.error("Failed to parse notified absence IDs from localStorage", e);
      }
    }
    setNotifiedAbsenceIds(initialNotifiedIdsFromStorage);

    const fetchAbsences = async () => {
      setIsLoading(true);
      setError(null);
      setAbsenceRecords([]);
      setCurrentAttendanceStats(initialAttendanceStats);

      try {
        const params = new URLSearchParams({
          etudiant_id: studentId.toString(),
          annee_scolaire_id: yearId.toString(),
          date_debut: format(startDate, 'yyyy-MM-dd'),
          date_fin: format(endDate, 'yyyy-MM-dd'),
        });

        const response = await fetch(`${API_BASE_URL}/absences?${params.toString()}`);

        if (!response.ok) {
          if (response.status === 404 || response.status === 204) {
            setAbsenceRecords([]);
            setCurrentAttendanceStats(initialAttendanceStats);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AbsenceAPI[] = await response.json();

        const mappedData: AbsenceRecord[] = data.map(item => ({
          id: item.id,
          date: item.date,
          dayOfWeek: format(new Date(item.date), 'EEEE', { locale: dateLocale }).charAt(0).toUpperCase() + 
                   format(new Date(item.date), 'EEEE', { locale: dateLocale }).slice(1),
          subject: translateSubject(item.matiere?.nom || ''),
          period: `${item.heure_debut?.substring(0, 5) || 'N/A'} - ${item.heure_fin?.substring(0, 5) || 'N/A'}`,
          justified: item.justifie && !!item.justification,
          justification: item.justification || t.common.noDetailsAvailable,
        }));

        setAbsenceRecords(mappedData);

        const total = mappedData.length;
        const justified = mappedData.filter(abs => abs.justified).length;
        setCurrentAttendanceStats({ 
          totalAbsences: total, 
          justifiedAbsences: justified, 
          unjustifiedAbsences: total - justified 
        });

        if (user?.id && mappedData.length > 0) {
          const idsKnownAtStartOfEffect = initialNotifiedIdsFromStorage;
          const newIdsAddedThisCycle = new Set<number>();

          mappedData.forEach(absence => {
            if (absence.id && !idsKnownAtStartOfEffect.has(absence.id)) {
              addNotification(
                t.studentAttendance.newAbsenceNotification({
                  date: format(new Date(absence.date), 'dd/MM/yyyy', { locale: dateLocale }),
                  subject: absence.subject,
                  period: absence.period
                }),
                'absence',
                '/student/my-attendance'
              );
              newIdsAddedThisCycle.add(absence.id);
            }
          });

          if (newIdsAddedThisCycle.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(idsKnownAtStartOfEffect), ...Array.from(newIdsAddedThisCycle)]);
            setNotifiedAbsenceIds(allNotifiedIdsNow);
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow)));
          }
        }
      } catch (err) {
        console.error("Error fetching absences:", err);
        toast({ 
          title: t.common.error, 
          description: t.studentAttendance.errorLoadingAbsences, 
          variant: "destructive" 
        });
        setError(t.studentAttendance.errorLoadingAbsences);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAbsences();
  }, [studentId, activeSchoolYear, startDate, endDate, t, dateLocale, addNotification, translateSubject]);

  const currentYearName = activeSchoolYear?.libelle || t.common.loading;
  const currentTermName = trimestres.find(t => t.id.toString() === selectedTermId)?.nom || t.studentAttendance.fullYear;

  if (!studentId) {
    return (
      <div className={`p-6 text-center text-red-500 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-xl font-semibold mb-2">{t.common.accessDenied}</h2>
        <p>{t.login.pleaseLogin}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center text-red-500 ${isRTL ? 'text-right' : 'text-left'}`}>
        <h2 className="text-xl font-semibold mb-2">{t.common.loadingError}</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <h1 className={`text-2xl font-bold mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.studentAttendance.title}
      </h1>

{/* Stats Cards - Improved Version */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Absences */}
        <Card className="dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.studentAttendance.totalAbsences}
            </CardTitle>
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-full">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentAttendanceStats.totalAbsences}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t.studentAttendance.recordedAbsences} ({currentTermName})
            
            </p>
          </CardContent>
        </Card>
        
                {/* Justified Absences */}
        <Card className="dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.studentAttendance.justifiedAbsences}
            </CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentAttendanceStats.justifiedAbsences}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              
              {t.studentAttendance.justifiedAbsencesCount}
            </p>
          </CardContent>
        </Card>
        
              {/* Unjustified Absences */}
        <Card className="dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              
              {t.studentAttendance.unjustifiedAbsences}
                       </CardTitle>
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {currentAttendanceStats.unjustifiedAbsences}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              
              {t.studentAttendance.daysWithoutJustification}
            </p>
          </CardContent>
        </Card>
                {/* Justification Rate */}
        <Card className="dark:bg-gray-800 shadow-sm hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.studentAttendance.justificationRate || 'Taux de justification'}
            </CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <Percent className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {justificationRate.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {t.studentAttendance.ofTotalAbsences || 'du total des absences'}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Filters Card */}
      <Card className="mb-6">
               <CardContent className="p-4">
          <div className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">{t.common.schoolYear}:</p>
              <Badge variant="secondary" className="text-base">{currentYearName}</Badge>
            </div>

            
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">{t.studentAttendance.termPeriod}:</p>
              <Select 
                value={selectedTermId} 
                onValueChange={setSelectedTermId} 
                disabled={trimestres.length === 0}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder={t.common.selectTerm} />
                </SelectTrigger>
                <SelectContent>
                  {activeSchoolYear && (
                    <SelectItem value="full-year">{t.studentAttendance.fullYear}</SelectItem>
                  )}
                  {trimestres.map((term) => (
                    <SelectItem key={term.id} value={term.id.toString()} className={isRTL ? 'text-right' : 'text-left'}>
                      {term.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Absence History Card */}
      <Card>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle>{t.studentAttendance.absenceHistory}</CardTitle>
          <CardDescription>{t.studentAttendance.allAbsencesList}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">{t.common.loading}</p>
            </div>
          ) : absenceRecords.length > 0 ? (
            <>
              {/* Desktop View: Table */}
              <div className="hidden lg:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.common.date}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.common.day}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.common.subject}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.studentAttendance.timeSlot}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.common.status.general}</TableHead>
                      <TableHead className={isRTL ? 'text-right' : 'text-left'}>{t.studentAttendance.justification}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {absenceRecords.map((absence) => (
                      <TableRow key={absence.id}>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          {format(new Date(absence.date), 'dd/MM/yyyy', { locale: dateLocale })}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>{absence.dayOfWeek}</TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>{absence.subject}</TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>{absence.period}</TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>
                          {absence.justified ? (
                            <Badge className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200">
                              {t.common.status.justifie}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 border-red-300 dark:bg-red-900 dark:text-red-200">
                              {t.common.status.nonjustif}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className={isRTL ? 'text-right' : 'text-left'}>{absence.justification}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View: Cards */}
              <div className="lg:hidden space-y-4">
                {absenceRecords.map((absence) => (
                  <Card key={absence.id} className="p-4 bg-white dark:bg-gray-800 shadow-sm">
                    <div className={`flex justify-between items-start mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={isRTL ? 'text-right' : 'text-left'}>
                        <p className="font-bold text-base text-gray-800 dark:text-white">{absence.subject}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(absence.date), 'dd MMMM yyyy', { locale: dateLocale })}</p>
                      </div>
                      {absence.justified ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{t.common.status.justifie}</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">{t.common.status.nonjustif}</Badge>
                      )}
                    </div>
                    <div className={`grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{t.common.day}:</p>
                      <p>{absence.dayOfWeek}</p>
                      <p className="font-medium text-gray-800 dark:text-gray-100">{t.studentAttendance.timeSlot}:</p>
                      <p>{absence.period}</p>
                      <p className="font-medium text-gray-800 dark:text-gray-100 col-span-2 mt-2">{t.studentAttendance.justification}:</p>
                      <p className="col-span-2 text-gray-500 dark:text-gray-400">{absence.justification}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className={`text-center py-8 text-gray-600 dark:text-gray-400 ${isRTL ? 'text-right' : 'text-left'}`}>
              <p>{t.studentAttendance.noAbsencesForPeriod}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StudentAttendance;