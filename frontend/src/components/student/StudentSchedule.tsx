import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, School, ChevronRight, ChevronLeft, Loader2, RefreshCw, Home, Users, BookOpen, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks, isValid, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@radix-ui/react-scroll-area';

// --- API Configuration ---
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- Types for API Data ---
interface AnneeAcademique { id: number; libelle: string; date_debut: string; date_fin: string; }
interface Classe { id: number; nom: string; niveau: string; annee_scolaire_id: number; }
interface Matiere { id: number; nom: string; code?: string; }
interface UserData { id: number; nom: string; prenom: string; email: string; role: 'admin' | 'eleve' | 'professeur' | 'tuteur'; }
interface Inscription { id: number; date_inscription: string; actif: boolean; utilisateurId: number; classeId: number; anneeScolaireId: number; }

interface EmploiDuTempsEntry {
    id: number;
    jour: string;
    heure_debut: string;
    heure_fin: string;
    classe_id: number;
    matiere_id: number;
    professeur_id: number;
    
    annee_academique_id: number;
}

interface ExceptionEmploiDuTempsEntry {
    id: number;
    date_exception: string;
    jour: string;
    heure_debut: string;
    heure_fin: string;
    classe_id: number | null;
    professeur_id: number | null;
    type_exception: 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
    nouvelle_matiere_id: number | null;
    nouveau_professeur_id: number | null;
    nouvelle_heure_debut: string | null;
    nouvelle_heure_fin: string | null;
    nouveau_jour: string | null;
    nouvelle_classe_id: number | null;
    motif: string | null;
    
}

type DisplayCourse = {
    id: number;
    time: string;
    subject: string;
    teacher: string;
    room: string;
    color: string;
    duration: number;
    type: 'base' | 'exception';
    isCanceled: boolean;
    exceptionType?: 'annulation' | 'remplacement_prof' | 'deplacement_cours' | 'jour_ferie' | 'evenement_special';
    originalEntryId?: number;
};

type WeeklySchedule = {
    [day: string]: DisplayCourse[];
};

const DAYS_OF_WEEK_FR = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const TIME_SLOTS_FOR_GRID = [
    '08:00-10:00',
    '10:15-12:00',
    '12:15-14:00',
   
];

const getCourseColor = (subjectId: number) => {
    const colors = [
        'bg-blue-100 text-blue-800 border-blue-300',
        'bg-green-100 text-green-800 border-green-300',
        'bg-red-100 text-red-800 border-red-300',
        'bg-purple-100 text-purple-800 border-purple-300',
        'bg-yellow-100 text-yellow-800 border-yellow-300',
        'bg-indigo-100 text-indigo-800 border-indigo-300',
        'bg-pink-100 text-pink-800 border-pink-300',
        'bg-teal-100 text-teal-800 border-teal-300',
    ];
    return colors[subjectId % colors.length];
};

const CourseCard: React.FC<{ course: DisplayCourse; showFullDetails?: boolean }> = ({ course, showFullDetails = true }) => {
    // Styles based on ProfessorSchedule.tsx's SessionCard logic
    let bgColor = 'bg-gradient-to-br from-blue-500 to-indigo-600'; // Default for base
    let textColor = 'text-white'; // Default for base
    let borderColor = 'border-blue-300'; // Default for base
    let currentBadgeClasses = 'bg-white/30 text-white backdrop-blur-sm'; // Default for base time badge
    let iconToRender: React.ReactNode = <BookOpen className="h-4 w-4 text-white" />; // Default for base
    let currentSubjectTextClasses = "font-semibold";
    let cardSpecificClasses = ""; // For line-through, opacity etc.
    let statusTextForBottomBadge = "";
     if (course.isCanceled) { // Actual cancellation
        bgColor = 'bg-gradient-to-br from-red-500 to-rose-600';
        textColor = 'text-white';
        borderColor = 'border-red-300';
        currentBadgeClasses = 'bg-red-200/50 text-red-900 backdrop-blur-sm';
        iconToRender = <User className="h-4 w-4 text-red-100" />; // Consider XCircle if imported
        currentSubjectTextClasses += " italic line-through";
        cardSpecificClasses = "opacity-70";
        statusTextForBottomBadge = "Annulé";
    } else if (course.exceptionType === 'jour_ferie') {
         bgColor = 'bg-gradient-to-br from-green-500 to-emerald-600';
        textColor = 'text-white';
        borderColor = 'border-green-300';
        currentBadgeClasses = 'bg-green-200/50 text-green-900 backdrop-blur-sm';
        iconToRender = <Calendar className="h-4 w-4 text-green-100" />; // Consider CalendarDays if imported
        statusTextForBottomBadge = "Férié";
    } else if (course.type === 'exception') {
        bgColor = 'bg-gradient-to-br from-yellow-400 to-orange-500';
        textColor = 'text-gray-900';
        borderColor = 'border-orange-300';
        currentBadgeClasses = 'bg-yellow-200/50 text-orange-900 backdrop-blur-sm';
        iconToRender = <RefreshCw className="h-4 w-4 text-yellow-900" />;
        statusTextForBottomBadge = course.exceptionType === 'remplacement_prof' ? 'Remplacement'
                                 : course.exceptionType === 'deplacement_cours' ? 'Déplacé'
                                 : 'Modifié';
    }
      const finalCardClasses = cn(
        "p-2 rounded-lg border-l-4 relative overflow-hidden group", // Base structure
        bgColor,
        textColor, // Applied to the card, children will inherit or can override
        borderColor,
        cardSpecificClasses,
        "transform transition-transform duration-200 hover:scale-[1.01]" // Added hover effect
    );

    return (
                <div className={finalCardClasses}>

            <div className="flex justify-between items-center mb-1">
                <h3 className={cn("text-base leading-tight", currentSubjectTextClasses, textColor)}>{course.subject}</h3>
                <Badge variant="outline" className={cn("ml-2 text-xs", currentBadgeClasses)}>
                    {course.time}
                </Badge>
            </div>
            {showFullDetails && (
                 <div className={cn("mt-1 text-sm flex items-center gap-2", textColor)}>
                    {React.cloneElement(iconToRender as React.ReactElement<any>, { className: cn((iconToRender as React.ReactElement<any>).props.className, "opacity-80") })}
                    <span className="opacity-90">{course.teacher}</span>
                    {/* <MapPin className="w-4 h-4 ml-2 text-current opacity-80" /> */}
                    {/* <span>{course.room}</span> */}
                    
                </div>
            )}
            {!showFullDetails && (
                                <p className={cn("text-xs opacity-80 mt-1", textColor)}>{course.teacher}</p>

            )}
           {statusTextForBottomBadge && (
                <Badge
                    variant="secondary"
                    className={cn(
                        "absolute bottom-1 right-1 px-2 py-0.5 text-xs font-semibold",
                        course.isCanceled ? "bg-red-600/90 text-white" :
                        course.exceptionType === 'jour_ferie' ? "bg-green-600/90 text-white" :
                        "bg-yellow-500/90 text-gray-900" // Example for other exceptions
                    )}
                >
                    {statusTextForBottomBadge}
                </Badge>
            )}
        </div>
    );
};

const EmptySlot: React.FC = () => (
    <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-2 h-full flex items-center justify-center text-gray-400 text-sm italic">
        Aucun cours
    </div>
);

export function StudentSchedule() {
    const [studentId, setStudentId] = useState<number | null>(null);
    const [studentName, setStudentName] = useState<string>('');
    const [studentClassId, setStudentClassId] = useState<number | null>(null);
    const [studentClassName, setStudentClassName] = useState<string>(''); // Nouvel état pour le nom de la classe

    const [currentAnneeAcademique, setCurrentAnneeAcademique] = useState<AnneeAcademique | null>(null);
    const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
    const [allClasses, setAllClasses] = useState<Classe[]>([]);
    const [allProfessors, setAllProfessors] = useState<UserData[]>([]);
    const [baseScheduleEntries, setBaseScheduleEntries] = useState<EmploiDuTempsEntry[]>([]);
    const [exceptionEntries, setExceptionEntries] = useState<ExceptionEmploiDuTempsEntry[]>([]);
    const [processedWeeklySchedule, setProcessedWeeklySchedule] = useState<WeeklySchedule>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedDay, setSelectedDay] = useState<string>('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [weekOffset, setWeekOffset] = useState(0);

    const currentWeekStart = useMemo(() =>
        startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }),
        [weekOffset]
    );

    const currentWeekEnd = useMemo(() =>
        endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
        [currentWeekStart]
    );

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const todayFr = format(currentTime, 'EEEE', { locale: fr });
        setSelectedDay(todayFr.charAt(0).toUpperCase() + todayFr.slice(1));
    }, [currentTime]);

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const userString = localStorage.getItem('user');
            if (!userString) {
                setError("Informations d'utilisateur introuvables. Veuillez vous reconnecter.");
                return;
            }
            const user: UserData = JSON.parse(userString);

            if (user.role !== 'eleve' || !user.id) {
                setError("Accès refusé : L'utilisateur n'est pas un élève ou l'ID est manquant.");
                return;
            }

            setStudentId(user.id);
            setStudentName(`${user.prenom} ${user.nom}`);

            const anneesRes: AnneeAcademique[] = await fetch(`${API_URL}/api/annees-academiques`).then(res => res.json());
            const activeAnnee = anneesRes.find((an: AnneeAcademique) =>
                new Date() >= parseISO(an.date_debut) && new Date() <= parseISO(an.date_fin)
            );

            if (!activeAnnee) {
                const sortedAnnees = anneesRes.sort((a, b) => parseISO(b.date_fin).getTime() - parseISO(a.date_fin).getTime());
                const fallbackAnnee = sortedAnnees.length > 0 ? sortedAnnees[0] : null;
                if (fallbackAnnee) {
                    setCurrentAnneeAcademique(fallbackAnnee);
                    toast({
                        title: "Année Académique",
                        description: "Aucune année académique active trouvée. Affichage de l'emploi du temps pour la dernière année disponible.",
                        variant: "default",
                    });
                } else {
                    setError("Aucune année académique trouvée dans le système.");
                    return;
                }
            } else {
                setCurrentAnneeAcademique(activeAnnee);
            }

            const inscriptionsRes: Inscription[] = await fetch(`${API_URL}/api/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnnee?.id || (anneesRes.length > 0 ? anneesRes[0].id : '')}`).then(res => res.json());
            const studentInscription = inscriptionsRes.find(inscription =>
                inscription.utilisateurId === user.id &&
                inscription.anneeScolaireId === (activeAnnee?.id || (anneesRes.length > 0 ? anneesRes[0].id : -1)) &&
                inscription.actif === true
            );

            if (!studentInscription) {
                setError("Aucune inscription active trouvée pour cet élève dans l'année académique actuelle. Veuillez contacter l'administration.");
                return;
            }
            setStudentClassId(studentInscription.classeId);

            const [matieresRes, classesRes, usersRes] = await Promise.all([
                fetch(`${API_URL}/api/matieres`).then(res => res.json()),
                fetch(`${API_URL}/api/classes`).then(res => res.json()),
                fetch(`${API_URL}/api/users`).then(res => res.json()),
            ]);

            setAllMatieres(matieresRes);
            setAllClasses(classesRes);
            setAllProfessors(usersRes.filter((u: UserData) => u.role === 'professeur'));

            // Déterminer le nom de la classe de l'étudiant
            if (studentInscription.classeId && classesRes.length > 0) {
                const foundClass = classesRes.find(c => c.id === studentInscription.classeId);
                if (foundClass) {
                    setStudentClassName(foundClass.nom);
                } else {
                    setStudentClassName('Classe inconnue');
                    console.warn(`[StudentSchedule] Classe ID ${studentInscription.classeId} not found in allClasses.`);
                }
            }

        } catch (err) {
            console.error("Erreur lors de l'initialisation des données:", err);
            toast({
                title: "Erreur de chargement",
                description: "Impossible de charger les données initiales ou de trouver votre classe. Vérifiez la connexion API.",
                variant: "destructive",
            });
            setError("Échec du chargement des données initiales. Veuillez réessayer.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchWeeklySchedule = useCallback(async () => {
        if (!studentClassId || !currentAnneeAcademique || !isValid(currentWeekStart) || !isValid(currentWeekEnd)) {
            return;
        }

        if (!loading) {
            setLoading(true);
        }
        setError(null);

        const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
        const weekEndDate = format(currentWeekEnd, 'yyyy-MM-dd');

        try {
            const [scheduleRes, exceptionsRes] = await Promise.all([
                fetch(`${API_URL}/api/emploi-du-temps?classe_id=${studentClassId}&annee_academique_id=${currentAnneeAcademique.id}`).then(res => res.json()),
                fetch(`${API_URL}/api/exception-emploi-du-temps?classe_id=${studentClassId}&start_date=${weekStartDate}&end_date=${weekEndDate}`).then(res => res.json()),
            ]);

            setBaseScheduleEntries(scheduleRes);
            setExceptionEntries(exceptionsRes);

        } catch (err) {
            console.error("Échec du chargement de l'emploi du temps:", err);
            toast({
                title: "Erreur de chargement",
                description: "Impossible de charger votre emploi du temps pour cette semaine.",
                variant: "destructive",
            });
            setError("Impossible de charger votre emploi du temps pour cette semaine.");
        } finally {
            setLoading(false);
        }
    }, [studentId, studentClassId, currentAnneeAcademique, currentWeekStart, currentWeekEnd, loading]);

    useEffect(() => {
        fetchWeeklySchedule();
    }, [fetchWeeklySchedule]);

    const memoizedProcessedWeeklySchedule = useMemo(() => {
        if (allMatieres.length === 0 || allProfessors.length === 0 || !isValid(currentWeekStart) || !isValid(currentWeekEnd)) {
            return {};
        }

        const weeklySchedule: WeeklySchedule = {};
        const weekDays = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd });

        DAYS_OF_WEEK_FR.forEach(dayName => {
            weeklySchedule[dayName] = [];
        });

        baseScheduleEntries.forEach(entry => {
            const matiere = allMatieres.find(m => m.id === entry.matiere_id);
            const professeur = allProfessors.find(p => p.id === entry.professeur_id);

            if (matiere && professeur && entry.jour && entry.heure_debut && entry.heure_fin) {
                const [startHour, startMin] = entry.heure_debut.split(':').map(Number);
                const [endHour, endMin] = entry.heure_fin.split(':').map(Number);
                const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

                if (DAYS_OF_WEEK_FR.includes(entry.jour)) {
                    weeklySchedule[entry.jour].push({
                        id: entry.id,
                        time: `${entry.heure_debut.substring(0, 5)}-${entry.heure_fin.substring(0, 5)}`,
                        subject: matiere.nom,
                        teacher: `${professeur.prenom} ${professeur.nom}`,
                        color: getCourseColor(matiere.id),
                        duration: duration,
                        type: 'base',
                        isCanceled: false,
                        room: ''
                    });
                }
            }
        });

        exceptionEntries.forEach(exception => {
            const exceptionDate = parseISO(exception.date_exception);
            if (!isValid(exceptionDate)) return;

            const exceptionDayName = format(exceptionDate, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(exceptionDate, 'EEEE', { locale: fr }).slice(1);

            const appliesToCurrentWeekDay = weekDays.some(day => isSameDay(day, exceptionDate));

            if (!appliesToCurrentWeekDay || !DAYS_OF_WEEK_FR.includes(exceptionDayName)) return;

            const timeSlot = `${exception.heure_debut.substring(0, 5)}-${exception.heure_fin.substring(0, 5)}`;

            const baseCourseIndex = weeklySchedule[exceptionDayName]?.findIndex(course =>
                course.time === timeSlot && !course.isCanceled
            );
            const baseCourse = baseCourseIndex !== -1 ? weeklySchedule[exceptionDayName][baseCourseIndex] : undefined;

            const [startHour, startMin] = exception.heure_debut.split(':').map(Number);
            const [endHour, endMin] = exception.heure_fin.split(':').map(Number);
            const duration = (endHour * 60 + endMin) - (startHour * 60 + startMin);

            const newCourseData: DisplayCourse = {
                id: exception.id,
                time: timeSlot,
                subject: 'N/A',
                teacher: 'N/A',
                color: 'bg-gray-100 text-gray-800 border-gray-300',
                duration: duration,
                type: 'exception',
                isCanceled: false,
                exceptionType: exception.type_exception,
                originalEntryId: baseCourse?.id,
                room: ''
            };

            switch (exception.type_exception) {
                case 'annulation':
                    if (baseCourse) {
                        baseCourse.isCanceled = true;
                        baseCourse.exceptionType = 'annulation';
                        baseCourse.subject = baseCourse.subject + " (Annulé)";
                        baseCourse.teacher = `Motif: ${exception.motif || 'Non spécifié'}`;
                        baseCourse.color = 'bg-red-100 text-red-800 border-red-300';
                    } else {
                        newCourseData.subject = `Annulation: ${exception.motif || 'Non spécifié'}`;
                        newCourseData.isCanceled = true;
                        newCourseData.color = 'bg-red-100 text-red-800 border-red-300';
                        weeklySchedule[exceptionDayName].push(newCourseData);
                    }
                    break;
                case 'jour_ferie':
                    weeklySchedule[exceptionDayName] = weeklySchedule[exceptionDayName].map(course => {
                        if (course.time === timeSlot || (exception.heure_debut === '00:00:00' && exception.heure_fin === '23:59:59')) {
                            return {
                                ...course,
                                isCanceled: false,
                                exceptionType: 'jour_ferie',
                                subject: 'Jour Férié',
                                teacher: `Motif: ${exception.motif || 'Non spécifié'}`,
                                color: '',
                            };
                        }
                        return course;
                    });
                    const existingHoliday = weeklySchedule[exceptionDayName].find(c =>
                        c.exceptionType === 'jour_ferie' && c.time === timeSlot
                    );
                    if (!existingHoliday) {
                        newCourseData.subject = `Jour Férié: ${exception.motif || 'Non spécifié'}`;
                        newCourseData.color = 'bg-green-100 text-green-800 border-green-300';
                        newCourseData.teacher = 'N/A';
                        weeklySchedule[exceptionDayName].push(newCourseData);
                    }
                    break;
                case 'remplacement_prof':
                case 'deplacement_cours':
                case 'evenement_special':
                    const newMatiere = allMatieres.find(m => m.id === exception.nouvelle_matiere_id);
                    const newProf = allProfessors.find(p => p.id === exception.nouveau_professeur_id);

                    newCourseData.subject = newMatiere?.nom || 'Matière modifiée';
                    newCourseData.teacher = newProf ? `${newProf.prenom} ${newProf.nom}` : 'Prof. modifié';
                    newCourseData.color = 'bg-yellow-100 text-yellow-800 border-yellow-300';

                    if (baseCourseIndex !== -1 && weeklySchedule[exceptionDayName][baseCourseIndex]) {
                        Object.assign(weeklySchedule[exceptionDayName][baseCourseIndex], newCourseData);
                        weeklySchedule[exceptionDayName][baseCourseIndex].id = exception.id;
                        weeklySchedule[exceptionDayName][baseCourseIndex].type = 'exception';
                    } else {
                        weeklySchedule[exceptionDayName].push(newCourseData);
                    }
                    break;
                default:
                    break;
            }
        });

        Object.keys(weeklySchedule).forEach(dayName => {
            weeklySchedule[dayName].sort((a, b) => {
                const timeA = parseISO(`2000-01-01T${a.time.split('-')[0]}:00`);
                const timeB = parseISO(`2000-01-01T${b.time.split('-')[0]}:00`);
                return timeA.getTime() - timeB.getTime();
            });
        });

        return weeklySchedule;
    }, [baseScheduleEntries, exceptionEntries, allMatieres, allProfessors, currentWeekStart, currentWeekEnd]);

    useEffect(() => {
        setProcessedWeeklySchedule(memoizedProcessedWeeklySchedule);
    }, [memoizedProcessedWeeklySchedule]);

    const todayFr = format(currentTime, 'EEEE', { locale: fr }).charAt(0).toUpperCase() + format(currentTime, 'EEEE', { locale: fr }).slice(1);
    const todayCourses = processedWeeklySchedule[todayFr] || [];

    const nextCourse = todayCourses.find(course => {
        const [start] = course.time.split('-');
        const [hours, minutes] = start.split(':').map(Number);
        const courseTime = new Date();
        courseTime.setHours(hours, minutes, 0, 0);
        return courseTime > currentTime && !course.isCanceled;
    });

    const getTimeUntilNextCourse = () => {
        if (!nextCourse) return null;

        const [start] = nextCourse.time.split('-');
        const [hours, minutes] = start.split(':').map(Number);
        const courseTime = new Date();
        courseTime.setHours(hours, minutes, 0, 0);

        const diff = courseTime.getTime() - currentTime.getTime();
        const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
        const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return { hours: hoursLeft, minutes: minutesLeft };
    };

    const timeUntilNext = getTimeUntilNextCourse();

    const getCurrentCourseProgress = () => {
        const currentCourse = todayCourses.find(course => {
            const [start, end] = course.time.split('-');
            const [startHours, startMins] = start.split(':').map(Number);
            const [endHours, endMins] = end.split(':').map(Number);

            const startTime = new Date();
            startTime.setHours(startHours, startMins, 0, 0);

            const endTime = new Date();
            endTime.setHours(endHours, endMins, 0, 0);

            return currentTime >= startTime && currentTime < endTime && !course.isCanceled;
        });

        if (!currentCourse) return null;

        const [start, end] = currentCourse.time.split('-');
        const [startHours, startMins] = start.split(':').map(Number);
        const [endHours, endMins] = end.split(':').map(Number);

        const startTime = new Date();
        startTime.setHours(startHours, startMins, 0, 0);

        const endTime = new Date();
        endTime.setHours(endHours, endMins, 0, 0);

        const totalDuration = endTime.getTime() - startTime.getTime();
        const elapsed = currentTime.getTime() - startTime.getTime();
        const progress = (elapsed / totalDuration) * 100;

        return { course: currentCourse, progress };
    };

    const currentCourseProgress = getCurrentCourseProgress();

    const weeklyHours = Object.values(processedWeeklySchedule).reduce((total, dayCourses) => {
        return total + dayCourses.reduce((dayTotal, course) => dayTotal + (course.isCanceled ? 0 : course.duration), 0);
    }, 0) / 60;

   

    if (error) {
        return (
            <div className="p-10 text-center bg-red-100 border border-red-300 rounded-xl shadow-lg m-6">
                <p className="font-extrabold text-3xl text-red-700 mb-4">Erreur de chargement !</p>
                <p className="text-xl text-red-600 mb-6">{error}</p>
                <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105">
                    <RefreshCw className="h-5 w-5 mr-2" /> Recharger la page
                </Button>
            </div>
        );
    }

    

    return (
<div className="p-6">
              <header className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 p-4 bg-white/70 backdrop-blur-md rounded-2xl border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 leading-tight drop">
                        Mon Emploi du Temps 
                        {studentClassName && studentClassName !== 'Classe inconnue' && (
                            <span className="text-2xl text-gray-500 ml-2 font-medium">({studentClassName})</span>
                        )}
                    </h1>
                    <p className="text-lg text-gray-700 mt-2">
                        {format(currentTime, 'EEEE dd MMMM yyyy', { locale: fr })}
                    </p>
                </div>
                <div className="flex items-center flex-wrap justify-end gap-2 bg-gray-50/50 p-2 rounded-xl shadow-inner border border-gray-100">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-x-1 hover:bg-blue-100"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-700" />
                    </Button>
                    <span className="font-extrabold text-xl text-gray-800 select-none mx-2">
                        {format(currentWeekStart, 'dd MMMM', { locale: fr })} - {format(currentWeekEnd, 'dd MMMM', { locale: fr })}
                    </span>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        className="rounded-full shadow-md hover:shadow-lg transition-all duration-300 transform hover:translate-x-1 hover:bg-blue-100"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-700" />
                    </Button>
                    <Button
                        variant="default"
                        size="sm"
                        onClick={() => setWeekOffset(0)}
                        className="ml-2 md:ml-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 flex items-center"
                    >
                        <Home className="h-4 w-4 mr-2" /> Cette Semaine
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                  <Card className="h-full transition-all duration-300">

                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                            <Calendar className="w-6 h-6 text-blue-600" />
                            <span>Aujourd'hui ({todayFr})</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayCourses.length > 0 ? (
                            <div className="space-y-3">
                                {todayCourses.map(course => (
                                    <CourseCard key={course.id} course={course} showFullDetails={false} />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 italic py-4">Aucun cours prévu aujourd'hui.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-full transition-all duration-300">

                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                            <Clock className="w-6 h-6 text-green-600" />
                            <span>Prochain Cours</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {nextCourse && timeUntilNext ? (
                            <div className="space-y-4">
                                <CourseCard course={nextCourse} />
                                <div className="text-center text-lg text-gray-700 font-semibold">
                                    Début dans :
                                    <span className="text-green-600 font-extrabold ml-2">
                                        {timeUntilNext.hours > 0 && `${timeUntilNext.hours}h`} {timeUntilNext.minutes}min
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 italic py-4">Pas de prochain cours aujourd'hui.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="h-full transition-all duration-300">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                            <BookOpen className="w-6 h-6 text-purple-600" />
                            <span>Cours Actuel</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentCourseProgress ? (
                            <div className="space-y-4">
                                <CourseCard course={currentCourseProgress.course} />
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-700 mb-2">Progression du cours :</p>
                                    <Progress value={currentCourseProgress.progress} className="h-3" />
                                    <p className="text-right text-sm text-gray-600 mt-1">
                                        {Math.round(currentCourseProgress.progress)}% terminé
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 italic py-4">Aucun cours en ce moment.</p>
                        )}
                    </CardContent>
                    <CardFooter className="pt-4 flex justify-between items-center text-sm text-gray-600">
                        <span>Total heures de la semaine :</span>
                        <span className="font-semibold text-gray-800">{weeklyHours.toFixed(1)}h</span>
                    </CardFooter>
                </Card>
            </div>

            <Card className="shadow-2xl border border-gray-100 bg-white/80 backdrop-blur-lg">
                <CardHeader className="flex flex-row justify-between items-center">
                    <CardTitle className="text-2xl font-bold text-gray-800">Emploi du Temps Hebdomadaire</CardTitle>
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'grid' | 'list')} className="w-[200px]">

                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="grid">Grille</TabsTrigger>
                            <TabsTrigger value="list">Liste</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent className="pt-6 px-6">
  {viewMode === 'grid' ? (
                        <ScrollArea className="w-full h-[700px] rounded-2xl border border-gray-200 bg-white shadow-inner p-4">
                            {/* Le div avec overflow-x-auto a été retiré ici */}
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th className="text-center font-extrabold text-xl text-gray-800 p-3 border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm">
                                            Heure
                                        </th>
                                        {DAYS_OF_WEEK_FR.map((day, index) => {
                                            const dayDate = eachDayOfInterval({ start: currentWeekStart, end: currentWeekEnd })[index];
                                            return (
                                                <th
                                                    key={day}
                                                    className={cn(
                                                        "text-center font-extrabold text-xl text-gray-800 p-2 border-b border-gray-200 sticky top-0 bg-white z-10 shadow-sm",
                                                        isToday(dayDate) ? 'text-blue-700 bg-blue-50 rounded-t-xl border-blue-200 shadow-lg' : ''
                                                    )}
                                                >
                                                    {day}
                                                    <div className="text-sm font-medium text-gray-500 mt-1">{format(dayDate, 'dd/MM')}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {TIME_SLOTS_FOR_GRID.map(slot => {
                                        const [startFull, endFull] = slot.split('-');
                                        const startTime = startFull.substring(0, 5);
                                        const endTime = endFull.substring(0, 5);
                                        return (
                                            <tr key={slot}>
                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10 border-r border-gray-200">
                                                    {`${startTime}-${endTime}`}
                                                </td>
                                                {DAYS_OF_WEEK_FR.map((day) => {
                                                    const coursesInSlot = processedWeeklySchedule[day]?.filter(
                                                        // Assurez-vous que ce format de temps correspond à celui dans processedWeeklySchedule
                                                        course => course.time === slot 
                                                    );
                                                    return (
                                                        <td key={`${day}-${slot}`} className="px-4 py-2 align-top">
                                                            {coursesInSlot && coursesInSlot.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {coursesInSlot.map(course => (
                                                                        <CourseCard key={course.id} course={course} showFullDetails={false} />
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <EmptySlot />
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </ScrollArea>
                    ) : (
                        <Tabs value={selectedDay} onValueChange={setSelectedDay} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-6 h-auto flex-wrap gap-1 p-1">
                                {DAYS_OF_WEEK_FR.map(day => (
                                    <TabsTrigger key={day} value={day} className="flex-grow">
                                        {day}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                            {DAYS_OF_WEEK_FR.map(day => (
                                <TabsContent key={day} value={day} className="mt-4">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4">{day}</h3>
                                    <div className="space-y-4">
                                        {processedWeeklySchedule[day] && processedWeeklySchedule[day].length > 0 ? (
                                            processedWeeklySchedule[day].map(course => (
                                                <CourseCard key={course.id} course={course} />
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-500 italic py-4">Aucun cours prévu pour ce jour.</p>
                                        )}
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    )}
                </CardContent>
            </Card>
        </div>
    )};