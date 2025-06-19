
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useNotifications } from '@/contexts/NotificationContext'; // Importer le hook de notifications

import { endOfYear, startOfYear } from 'date-fns';

// --- API Configuration ---
const API_BASE_URL = 'http://localhost:3000/api';

// --- Interfaces for API Data ---
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Trimestre {
  id: number;
  nom: string; // Ex: "Trimestre 1"
  date_debut: string;
  date_fin: string;
  anneeScolaire?: AnneeAcademique; // Assuming relation is expanded
}

interface AbsenceAPI {
  id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  justifie: boolean;
  justification: string;
  etudiant?: { id: number; nom: string; prenom: string };
  matiere?: { id: number; nom: string };
  classe?: { id: number; nom: string };
  anneeScolaire?: { id: number; libelle: string };
}

// Interface for processed absence records for the table
interface AbsenceRecord {
  id: number;
  date: string;
  dayOfWeek: string;
  subject: string;
  period: string;
  justified: boolean;
  justification: string;
}

// Interface for attendance statistics
interface AttendanceStats {
  totalAbsences: number;
  justifiedAbsences: number;
  unjustifiedAbsences: number;
  // Note: Calculating total school days/presence percentage is complex
  // without a full school calendar API. We'll stick to absence counts for now.
}

// Initial stats state
const initialAttendanceStats: AttendanceStats = {
  totalAbsences: 0,
  justifiedAbsences: 0,
  unjustifiedAbsences: 0,
};



export function StudentAttendance() {
  const { user } = useAuth(); // Get logged-in user
    const { addNotification } = useNotifications(); // Récupérer la fonction d'ajout de notification


  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState<string>('');
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>(''); // Use ID for terms

  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [notifiedAbsenceIds, setNotifiedAbsenceIds] = useState<Set<number>>(new Set());

  const [absenceRecords, setAbsenceRecords] = useState<AbsenceRecord[]>([]);
  const [currentAttendanceStats, setCurrentAttendanceStats] = useState<AttendanceStats>(initialAttendanceStats);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Fetch academic years on mount
  useEffect(() => {
    const fetchYears = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/annees-academiques`);
        if (!response.ok) throw new Error("Impossible de charger les années académiques.");
        const data: AnneeAcademique[] = await response.json();
        setAnneesAcademiques(data);

        // Attempt to select the current or latest year
        if (data.length > 0) {
          const currentYear = new Date().getFullYear();
          const defaultYear = data.find(a => new Date(a.date_debut).getFullYear() <= currentYear && new Date(a.date_fin).getFullYear() >= currentYear) || data[data.length - 1];
          setSelectedSchoolYearId(defaultYear.id.toString());
        }
      } catch (err) {
        console.error("Error fetching academic years:", err);
        toast({ title: "Erreur", description: "Impossible de charger les années académiques.", variant: "destructive" });
        setError("Impossible de charger les années académiques.");
      }
    };
    fetchYears();
  }, []);

  // Fetch trimestres when academic year changes
  useEffect(() => {
    const yearId = parseInt(selectedSchoolYearId);
    if (!yearId) {
      setTrimestres([]);
      setSelectedTermId('');
      return;
    }
    const fetchTrimestres = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/trimestres?anneeScolaireId=${yearId}`);
        if (!response.ok) throw new Error("Impossible de charger les trimestres.");
        const data: Trimestre[] = await response.json();
        setTrimestres(data);
        // Select the first term by default if available
        if (data.length > 0) {
          setSelectedTermId(data[0].id.toString());
        } else {
          setSelectedTermId('');
        }
      } catch (err) {
        console.error("Error fetching trimestres:", err);
        toast({ title: "Erreur", description: "Impossible de charger les trimestres.", variant: "destructive" });
        setTrimestres([]);
        setSelectedTermId('');
      }
    };
    fetchTrimestres();
  }, [selectedSchoolYearId]);

  // Set date range based on selected term or year
  useEffect(() => {
    const year = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId);
    const term = trimestres.find(t => t.id.toString() === selectedTermId);

    if (term) {
      setStartDate(new Date(term.date_debut));
      setEndDate(new Date(term.date_fin));
    } else if (year) {
      // "Année entière" or no term selected, use year dates
      setStartDate(new Date(year.date_debut));
      setEndDate(new Date(year.date_fin));
    } else {
      // No year selected, clear dates
      setStartDate(undefined);
      setEndDate(undefined);
    }
  }, [selectedTermId, selectedSchoolYearId, anneesAcademiques, trimestres]);

  // Fetch absences when filters or user change
  useEffect(() => {
    const studentId = user?.id;
    const yearId = parseInt(selectedSchoolYearId);
    

    // --- API Fetching Logic ---
    if (!studentId || !yearId || !startDate || !endDate) {
      setAbsenceRecords([]);
      setCurrentAttendanceStats(initialAttendanceStats);
      setIsLoading(false);
      return;
    }

    // Charger les IDs des absences déjà notifiées depuis localStorage
    const storageKey = `notified_absence_ids_${user.id}`;
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
            // No absences found is not an error, just empty data
            setAbsenceRecords([]);
            setCurrentAttendanceStats(initialAttendanceStats);
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: AbsenceAPI[] = await response.json();

        // Map API data to AbsenceRecord interface
        const mappedData: AbsenceRecord[] = data.map(item => ({
          id: item.id,
          date: item.date,
          dayOfWeek: format(new Date(item.date), 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(new Date(item.date), 'EEEE', { locale: fr }).slice(1),
          subject: item.matiere?.nom || 'Matière inconnue',
          period: `${item.heure_debut?.substring(0, 5) || 'N/A'} - ${item.heure_fin?.substring(0, 5) || 'N/A'}`,
          justified: item.justifie && !!item.justification, // Le statut est justifié SEULEMENT si l'API l'indique ET qu'il y a une justification textuelle.
          justification: item.justification || 'Non fournie',
        }));

        setAbsenceRecords(mappedData);

        // Calculate basic stats
        const total = mappedData.length;
        const justified = mappedData.filter(abs => abs.justified).length;
        setCurrentAttendanceStats({ totalAbsences: total, justifiedAbsences: justified, unjustifiedAbsences: total - justified });
// Logique de notification pour les nouvelles absences
        if (user?.id && mappedData.length > 0) {
          const idsKnownAtStartOfEffect = initialNotifiedIdsFromStorage;
          const newIdsAddedThisCycle = new Set<number>();

          mappedData.forEach(absence => {
            if (absence.id && !idsKnownAtStartOfEffect.has(absence.id)) {
              addNotification(
                `Nouvelle absence enregistrée le ${format(new Date(absence.date), 'dd/MM/yyyy', { locale: fr })} en ${absence.subject} (${absence.period}).`,
                'absence',
                '/student/my-attendance' // Lien vers la page des absences
              );
              newIdsAddedThisCycle.add(absence.id);
            }
          });

          if (newIdsAddedThisCycle.size > 0) {
            const allNotifiedIdsNow = new Set([...Array.from(idsKnownAtStartOfEffect), ...Array.from(newIdsAddedThisCycle)]);
            setNotifiedAbsenceIds(allNotifiedIdsNow); // Mettre à jour l'état React
            localStorage.setItem(storageKey, JSON.stringify(Array.from(allNotifiedIdsNow))); // Mettre à jour localStorage
          }
        }
      } catch (err) {
        console.error("Error fetching absences:", err);
        toast({ title: "Erreur", description: "Impossible de charger vos absences.", variant: "destructive" });
        setError("Impossible de charger vos absences.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAbsences();

  }, [user?.id, selectedSchoolYearId, startDate, endDate, addNotification]); // Ajout de addNotification aux dépendances

  
  // Determine the currently selected year and term names for display
  const currentYearName = anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId)?.libelle || 'Année inconnue';
  const currentTermName = trimestres.find(t => t.id.toString() === selectedTermId)?.nom || 'Année entière';

  if (!user) {
    return (
      <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-semibold mb-2">Accès refusé.</h2>
        <p>Veuillez vous connecter pour voir vos absences.</p>
      </div>
    );
  }

  if (error) {
    return (
       <div className="p-6 text-center text-red-500">
        <h2 className="text-xl font-semibold mb-2">Erreur de chargement.</h2>
        <p>{error}</p>
      </div>
      );
  
  };
// Calculate stats from fetched data
  const totalAbsences = absenceRecords.length;
  // Utiliser les stats calculées depuis l'état
  const justifiedAbsences = currentAttendanceStats.justifiedAbsences;
  const unjustifiedAbsences = currentAttendanceStats.unjustifiedAbsences;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Absences</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
             <h3 className="font-semibold text-lg mb-2">Absences totales ({currentTermName})</h3>
+            <p className="text-3xl font-bold text-red-600">{totalAbsences}</p>
            <p className="text-sm text-gray-600">absences enregistrées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Absences justifiées ({currentTermName})</h3>
            <p className="text-3xl font-bold text-green-600">{justifiedAbsences}</p>
            <p className="text-sm text-gray-600">absences justifiées</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Absences non justifiées</h3>
+            <p className="text-3xl font-bold text-red-600">{unjustifiedAbsences}</p>
            <p className="text-sm text-gray-600">jours sans justification</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Sélectionnez le trimestre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
               <p className="text-sm font-medium text-gray-600 mb-2">Année Scolaire</p>
              <Select value={selectedSchoolYearId} onValueChange={setSelectedSchoolYearId} disabled={true}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                   {anneesAcademiques.map((annee) => (
                    <SelectItem key={annee.id} value={annee.id.toString()}>
                      {annee.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
               <p className="text-sm font-medium text-gray-600 mb-2">Période (Trimestre)</p>
              <Select value={selectedTermId} onValueChange={setSelectedTermId} disabled={trimestres.length === 0}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {/* Option for the entire year */}
                  {anneesAcademiques.find(a => a.id.toString() === selectedSchoolYearId) && (
                     <SelectItem value="Année entière">Année entière</SelectItem>
                  )}
                  {trimestres.map((term) => (
                    <SelectItem key={term.id} value={term.id.toString()}>
                      {term.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des absences</CardTitle>
          <CardDescription>Liste de toutes vos absences</CardDescription>
        </CardHeader>
        <CardContent>
{isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Chargement des absences...</p>
            </div>
          ) : absenceRecords.length > 0 ? (            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Date</TableHead><TableHead>Jour</TableHead><TableHead>Matière</TableHead><TableHead>Horaire</TableHead><TableHead>Statut</TableHead><TableHead>Justification</TableHead></TableRow>

                </TableHeader>
                <TableBody>
                   {absenceRecords.map((absence) => ( // Use absenceRecords directly
                       <TableRow key={absence.id}>{/* Use absence ID as key */}
                      <TableCell>{format(new Date(absence.date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                 
                      <TableCell>{absence.dayOfWeek}</TableCell>
                      <TableCell>{absence.subject}</TableCell>
                      <TableCell>{absence.period}</TableCell>
                      <TableCell>
                                                {absence.justified ? <Badge className="bg-green-100 text-green-700 border-green-300">Justifiée</Badge> : <Badge className="bg-red-100 text-red-700 border-red-300">Non justifiée</Badge>}

                      </TableCell>
                      <TableCell>
                        {absence.justification || 'Non fournie'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
             </div> // End overflow-x-auto
          ) : ( // If absenceRecords is empty after loading
            <div className="text-center py-8 text-gray-600">
              <p>Aucune absence pour la période sélectionnée.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
