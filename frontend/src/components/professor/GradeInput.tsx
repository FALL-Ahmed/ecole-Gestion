import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
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
import { toast } from '@/hooks/use-toast';
import { Save, Loader2, BookOpen, CalendarDays, Users, Bookmark, School, ClipboardList, User, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

// Types
type AnneeScolaire = { id: number; libelle: string; dateDebut?: string; dateFin?: string; };
type Classe = { id: number; nom: string; niveau?: string; annee_scolaire_id?: number };
type Matiere = { id: number; nom: string; code?: string; };
type Trimestre = { id: number; nom: string; date_debut: string; date_fin: string; };
type Utilisateur = {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: 'professeur' | 'eleve' | 'admin' | string;
  motDePasse?: string;
  genre?: string;
  adresse?: string;
  tuteurNom?: string;
  tuteurTelephone?: string;
  photoUrl?: string | null;
  actif?: boolean;
};
type AffectationApiResponse = {
  id: number;
  professeur: Utilisateur;
  matiere: Matiere;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
};
type ProcessedAffectation = {
  id: number;
  professeurId: number;
  professeurNomComplet: string;
  matiereId: number;
  matiereNom: string;
  classeId: number;
  classeNom: string;
  anneeScolaireId: number;
  anneeScolaireLibelle: string;
};
type Eleve = { id: number; nom: string; prenom: string; };
type EvaluationType = { id: number; nom: string; };
type InscriptionApiResponse = {
  id: number;
  date_inscription: string;
  actif: boolean;
  utilisateur: Utilisateur;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
};
type Configuration = {
  id: number;
  annee_scolaire?: AnneeScolaire;
  annee_academique_active_id?: number;
};
type NoteEntry = { eleveId: number; nom: string; prenom: string; note: string };

export function GradeInput() {
  const { t, language } = useLanguage();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  const { user } = useAuth();

  // States
  const [activeAnneeScolaire, setActiveAnneeScolaire] = useState<AnneeScolaire | null>(null);
  const [currentTrimestre, setCurrentTrimestre] = useState<Trimestre | null>(null);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  const [allUsers, setAllUsers] = useState<Utilisateur[]>([]);
  const [processedAffectations, setProcessedAffectations] = useState<ProcessedAffectation[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedEvalTypeId, setSelectedEvalTypeId] = useState<number | null>(null);
  const [date, setDate] = useState<string>('');
  const [currentMatiere, setCurrentMatiere] = useState<Matiere | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [loadingInitialData, setLoadingInitialData] = useState<boolean>(true);
  const [loadingEleves, setLoadingEleves] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Load initial data
  useEffect(() => {
    const fetchAllBaseData = async () => {
      setLoadingInitialData(true);
      try {
        const configRes = await fetch(`${API_URL}/api/configuration`);
        if (!configRes.ok) {
          const errorText = await configRes.text();
throw new Error(t.gradeInput.errorLoadingConfig(errorText));
        }
        
        const configData: Configuration | Configuration[] = await configRes.json();
        let fetchedAnneeScolaire: AnneeScolaire | null = null;
        
        if (Array.isArray(configData) && configData.length > 0) {
          if (configData[0].annee_scolaire) {
            fetchedAnneeScolaire = configData[0].annee_scolaire;
          } else if (configData[0].annee_academique_active_id) {
            fetchedAnneeScolaire = { 
              id: configData[0].annee_academique_active_id, 
              libelle: t.common.activeYear 
            };
          }
        } else if (configData && !Array.isArray(configData)) {
          if (configData.annee_scolaire) {
            fetchedAnneeScolaire = configData.annee_scolaire;
          } else if (configData.annee_academique_active_id) {
            fetchedAnneeScolaire = { 
              id: configData.annee_academique_active_id, 
              libelle: t.common.activeYear 
            };
          }
        }

        if (fetchedAnneeScolaire && fetchedAnneeScolaire.id) {
          setActiveAnneeScolaire(fetchedAnneeScolaire);
        } else {
          toast({
            title: t.common.missingConfig,
            description: t.gradeInput.missingYearConfig,
            variant: 'destructive',
          });
          setLoadingInitialData(false);
          return;
        }

        const [affectationsRes, allClassesRes, utilisateursRes] = await Promise.all([
          fetch(`${API_URL}/api/affectations?include=professeur,matiere,classe,annee_scolaire`),
          fetch(`${API_URL}/api/classes`),
          fetch(`${API_URL}/api/users`),
        ]);

        const checkResponse = async (res: Response, name: string) => {
          if (!res.ok) {
            const errorText = await res.text();
throw new Error(t.gradeInput.errorLoadingData(name, errorText));
          }
        };

        await Promise.all([
          checkResponse(affectationsRes, 'affectations'),
          checkResponse(allClassesRes, 'classes'),
          checkResponse(utilisateursRes, 'utilisateurs'),
        ]);

        const [rawAffectations, rawAllClasses, rawUtilisateurs] = await Promise.all([
          affectationsRes.json(),
          allClassesRes.json(),
          utilisateursRes.json(),
        ]);

        const processed = rawAffectations.map(aff => {
          if (!aff.professeur || !aff.matiere || !aff.classe || !aff.annee_scolaire) {
console.log('WARN:', t.gradeInput.invalidAssignment(aff));
            return null;
          }
          return {
            id: aff.id,
            professeurId: aff.professeur.id,
            professeurNomComplet: `${aff.professeur.nom} ${aff.professeur.prenom}`,
            matiereId: aff.matiere.id,
            matiereNom: aff.matiere.nom,
            classeId: aff.classe.id,
            classeNom: aff.classe.nom,
            anneeScolaireId: aff.annee_scolaire.id,
            anneeScolaireLibelle: aff.annee_scolaire.libelle,
          };
        }).filter(Boolean) as ProcessedAffectation[];

        setProcessedAffectations(processed);
        setAllClasses(rawAllClasses);
        setAllUsers(rawUtilisateurs);
      const uniqueMatieres = Array.from(
  new Map(rawAffectations.map(aff => [aff.matiere.id, aff.matiere])).values()
) as Matiere[];
setAllMatieres(uniqueMatieres);
      } catch (error) {
console.log('ERROR:', t.gradeInput.globalError(String(error)));
        toast({
          title: t.common.loadingError,
          description: error instanceof Error ? error.message : t.gradeInput.unknownLoadingError,
          variant: 'destructive',
        });
      } finally {
        setLoadingInitialData(false);
      }
    };

    fetchAllBaseData();
  }, [t]);

  // Filter classes for professor and active year
  const classesForProfessorAndActiveAnnee = useMemo(() => {
    if (activeAnneeScolaire === null || user === null || user.role !== 'professeur' || processedAffectations.length === 0) {
      return [];
    }

    const selectedProfesseurId = user.id;
    const filteredAffectations = processedAffectations.filter(
      (aff) => aff.anneeScolaireId === activeAnneeScolaire.id && aff.professeurId === selectedProfesseurId
    );

    const classIdsSet = new Set(filteredAffectations.map((aff) => aff.classeId));
    const filteredClasses = allClasses.filter((cls) => classIdsSet.has(cls.id));

    return filteredClasses;
  }, [activeAnneeScolaire, processedAffectations, allClasses, user]);

  // Determine current subject
  useEffect(() => {
    const selectedProfesseurId = user?.id || null;

    if (!user || user.role !== 'professeur') {
      setCurrentMatiere(null);
      return;
    }

    if (activeAnneeScolaire === null || selectedClassId === null || selectedProfesseurId === null) {
      setCurrentMatiere(null);
      return;
    }

    const foundAffectation = processedAffectations.find(
      aff =>
        aff.anneeScolaireId === activeAnneeScolaire.id &&
        aff.classeId === selectedClassId &&
        aff.professeurId === selectedProfesseurId
    );

    if (foundAffectation) {
      const matiereDetails = allMatieres.find(m => m.id === foundAffectation.matiereId);
      if (matiereDetails) {
        setCurrentMatiere(matiereDetails);
      } else {
        setCurrentMatiere(null);
      }
    } else {
      setCurrentMatiere(null);
      if (processedAffectations.length > 0) {
        toast({
          title: t.gradeInput.noAssignmentFound,
          description: t.gradeInput.noAssignmentForSelection,
          variant: 'default',
        });
      }
    }
  }, [activeAnneeScolaire, selectedClassId, user, processedAffectations, allMatieres, t]);

  // Reset selections when active year changes
  useEffect(() => {
    setSelectedClassId(null);
  }, [activeAnneeScolaire]);

  // Load trimester based on date
  useEffect(() => {
    const fetchTrimestre = async () => {
      if (!date || !activeAnneeScolaire) {
        setCurrentTrimestre(null);
        return;
      }

      try {
        const trimestreRes = await fetch(`${API_URL}/api/trimestres/by-date?date=${date}&anneeId=${activeAnneeScolaire.id}`);
        
        if (!trimestreRes.ok) {
          if (trimestreRes.status === 404 || trimestreRes.status === 204) {
            setCurrentTrimestre(null);
            return;
          }
          const errorText = await trimestreRes.text();
          throw new Error(t.gradeInput.errorDeterminingTerm(errorText));
        }

        const responseText = await trimestreRes.text();
        if (!responseText) {
          setCurrentTrimestre(null);
          return;
        }
        const trimestreData = JSON.parse(responseText);
        setCurrentTrimestre(trimestreData);
      } catch (error) {
console.log('ERROR:', t.gradeInput.errorFetchingTerm(String(error)));
        toast({
          title: t.gradeInput.termError,
          description: error instanceof Error ? error.message : t.gradeInput.unknownTermError,
          variant: 'destructive',
        });
        setCurrentTrimestre(null);
      }
    };

    fetchTrimestre();
  }, [date, activeAnneeScolaire, t]);

  // Evaluation types based on trimester
  const evaluationTypes: EvaluationType[] = useMemo(() => {
    if (!currentTrimestre) return [];

    if (currentTrimestre.nom === 'Trimestre 1') {
      return [
        { id: 1, nom: t.gradeInput.test1 },
        { id: 2, nom: t.gradeInput.test2 },
        { id: 3, nom: t.gradeInput.exam1 },
      ];
    } else if (currentTrimestre.nom === 'Trimestre 2') {
      return [
        { id: 4, nom: t.gradeInput.test3 },
        { id: 5, nom: t.gradeInput.test4 },
        { id: 6, nom: t.gradeInput.exam2 },
      ];
    } else if (currentTrimestre.nom === 'Trimestre 3') {
      return [
        { id: 7, nom: t.gradeInput.test5 },
        { id: 8, nom: t.gradeInput.test6 },
        { id: 9, nom: t.gradeInput.exam3 },
      ];
    } else {
      return [
        { id: 99, nom: t.gradeInput.otherType },
      ];
    }
  }, [currentTrimestre, t]);

  // Reset evaluation type if list changes
  useEffect(() => {
    if (selectedEvalTypeId !== null && !evaluationTypes.some(type => type.id === selectedEvalTypeId)) {
      setSelectedEvalTypeId(null);
    }
  }, [evaluationTypes, selectedEvalTypeId]);

  // Load students and initialize notes
  useEffect(() => {
    const fetchElevesAndInitNotes = async () => {
      if (selectedClassId === null || activeAnneeScolaire === null || activeAnneeScolaire.id === undefined || loadingInitialData) {
        setLoadingEleves(false);
        setEleves([]);
        setNotes([]);
        return;
      }

      setLoadingEleves(true);
      setEleves([]);
      setNotes([]);

      try {
        const res = await fetch(
          `${API_URL}/api/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${activeAnneeScolaire.id}`
        );

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(t.gradeInput.errorLoadingEnrollments(errorText));
        }

        const data: InscriptionApiResponse[] = await res.json();

        const fetchedEleves: Eleve[] = data
          .map((inscription: InscriptionApiResponse) => {
            const user = inscription.utilisateur;
            if (!user || user.role !== 'eleve') return null;
            return {
              id: user.id,
              nom: user.nom,
              prenom: user.prenom,
            };
          })
          .filter(Boolean) as Eleve[];

        setEleves(fetchedEleves);
        const initialNotes = fetchedEleves.map(e => ({ 
          eleveId: e.id, 
          nom: e.nom, 
          prenom: e.prenom, 
          note: '' 
        }));
        setNotes(initialNotes);

      } catch (error) {
        console.log('ERROR:', t.gradeInput.errorLoadingStudents(error));
        toast({
          title: t.common.error,
          description: error instanceof Error ? error.message : t.gradeInput.unknownStudentError,
          variant: 'destructive'
        });
        setEleves([]);
        setNotes([]);
      } finally {
        setLoadingEleves(false);
      }
    };

    fetchElevesAndInitNotes();
  }, [selectedClassId, activeAnneeScolaire, loadingInitialData, t]);

  // Handle note changes
 const handleNoteChange = useCallback((eleveId: number, note: string) => {
    if (note === '') {
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note: '' } : n)));
      return;
    }

    const numericNote = parseFloat(note);
    if (isNaN(numericNote)) { // Parenthèse ajoutée ici
      setNotes(prev => prev.map(n => (n.eleveId === eleveId ? { ...n, note } : n)));
    } else {
      setNotes(prev => prev.map(n => (
        n.eleveId === eleveId ? { 
          ...n, 
          note: Math.min(20, Math.max(0, numericNote)).toString() 
        } : n
      )));
    }
}, []);

  // Save notes
  const saveNotes = useCallback(async () => {
    const professeurId = user?.id || null;

    if (!professeurId) {
      toast({ 
        title: t.common.error, 
        description: t.gradeInput.notLoggedIn, 
        variant: 'destructive' 
      });
      return;
    }

    if (!activeAnneeScolaire || !selectedClassId || !selectedEvalTypeId || !date || !currentMatiere || !currentTrimestre || notes.length === 0) {
      toast({
        title: t.common.missingFields,
        description: t.gradeInput.missingFields,
        variant: 'destructive'
      });
      return;
    }

    const invalidNotes = notes.filter(n => {
      const numericNote = parseFloat(n.note);
      return n.note === '' || isNaN(numericNote) || numericNote < 0 || numericNote > 20;
    });

    if (invalidNotes.length > 0) {
      toast({
        title: t.gradeInput.invalidNotes,
        description: t.gradeInput.invalidNotesDesc,
        variant: 'destructive'
      });
      return;
    }

    setIsSaving(true);
    try {
      const trimestreId = currentTrimestre?.id;
      if (!trimestreId) {
        throw new Error(t.gradeInput.termNotFound);
      }

      const evaluationTypeSelected = evaluationTypes.find(t => t.id === selectedEvalTypeId);
      if (!evaluationTypeSelected) {
        toast({
          title: t.gradeInput.invalidEvalType,
          description: t.gradeInput.selectValidEvalType,
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      // Create evaluation
      const evaluationPayload = {
        matiere: { id: currentMatiere.id },
        classe: { id: selectedClassId },
        professeur: { id: professeurId },
        type: evaluationTypeSelected.nom,
        dateEval: date,
        trimestre: { id: trimestreId },
        anneeScolaire: { id: activeAnneeScolaire.id }
      };

      const token = localStorage.getItem('token');
      const evalRes = await fetch(`${API_URL}/api/evaluation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(evaluationPayload)
      });

      if (!evalRes.ok) {
        const errorText = await evalRes.text();
        throw new Error(t.gradeInput.errorCreatingEval(errorText));
      }

      const evalData = await evalRes.json();
      const evaluationId = evalData?.id;
      if (!evaluationId) throw new Error(t.gradeInput.noEvalIdReturned);

      // Save notes
      const notesToSave = notes.map(n => ({
        evaluation_id: evaluationId,
        etudiant_id: n.eleveId,
        note: parseFloat(n.note),
      }));

      const noteRes = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(notesToSave)
      });

      if (!noteRes.ok) {
        const errorText = await noteRes.text();
        throw new Error(t.gradeInput.errorSavingNotes(errorText));
      }

      toast({
        title: t.common.success,
        description: t.gradeInput.successSave,
        variant: 'default'
      });

      // Reset form
      setSelectedEvalTypeId(null);
      setDate('');
      setNotes(prev => prev.map(n => ({ ...n, note: '' })));

    } catch (error) {
      console.log('ERROR:', t.gradeInput.savingError(error));
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.gradeInput.unknownSavingError,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  }, [activeAnneeScolaire, selectedClassId, user, selectedEvalTypeId, date, currentMatiere, currentTrimestre, notes, evaluationTypes, t]);

  // Check if form is complete
  const isFormComplete = useMemo(() => (
    activeAnneeScolaire !== null &&
    selectedClassId !== null &&
    selectedEvalTypeId !== null &&
    date !== '' &&
    currentMatiere !== null &&
    currentTrimestre !== null &&
    user?.role === 'professeur'
  ), [activeAnneeScolaire, selectedClassId, selectedEvalTypeId, date, currentMatiere, currentTrimestre, user]);

  if (loadingInitialData) {
    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 p-6 md:p-4 flex flex-col items-center justify-center ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <Loader2 className="h-16 w-16 animate-spin text-blue-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700  dark:text-gray-300">{t.common.loadingInitialData}</span>
      </div>
    );
  }

  if (!user || user.role !== 'professeur') {
    return (
      <div className={`min-h-screen bg-gray-50 p-6 md:p-4 flex flex-col items-center justify-center ${language === 'ar' ? 'rtl' : 'ltr'}`}>
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <span className="text-2xl font-medium text-gray-700">{t.common.accessDenied}</span>
        <p className="text-lg text-gray-600 mt-2">{t.gradeInput.teachersOnly}</p>
      </div>
    );
  }

  return (
<div className="min-h-screen p-6 md:p-4 pb-[env(safe-area-inset-bottom)]" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="space-y-10">
        <h1 className="text-2xl font-bold mb-6">{t.gradeInput.title}</h1>

        {/* Evaluation Criteria Card */}
<Card className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden">
          <CardHeader className="p-6 border-b dark:border-gray-700">
            
            <div className="flex items-center space-x-3">
                            <ClipboardList className="h-6 me-2 w-6 text-blue-600" />
              <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">{t.gradeInput.evalCriteria}</CardTitle>
            
            </div>
          </CardHeader>
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ">
            {/* Current Academic Year */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
        <CalendarDays className="h-4 w-4 me-2 text-blue-600 dark:text-blue-400" />
        {t.gradeInput.currentAcademicYear}
      </label>

      <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <span className="font-medium">
                  {activeAnneeScolaire?.libelle || t.common.loading}
                </span>
              </div>
            </div>

            {/* Class Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <School className="h-4 w-4 me-2 text-blue-600" />
                {t.common.class}
              </label>
              <Select
                onValueChange={val => setSelectedClassId(val ? Number(val) : null)}
                value={selectedClassId !== null ? String(selectedClassId) : ''}
                disabled={classesForProfessorAndActiveAnnee.length === 0 || !activeAnneeScolaire}
              >
        <SelectTrigger className="w-full border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                  <SelectValue placeholder={t.common.selectAClass} />
                </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  {classesForProfessorAndActiveAnnee.length > 0 ? (
                    classesForProfessorAndActiveAnnee.map(classe => (
<SelectItem 
                key={classe.id} 
                value={String(classe.id)}
                className="hover:bg-gray-100 dark:hover:bg-gray-700"
              >                        {classe.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      {activeAnneeScolaire === null ? t.common.loadingYear : t.gradeInput.noClassesAssigned}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Teacher Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <User className="h-4 w-4 me-2 text-blue-600" />
                {t.common.teacher}
              </label>
      <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                {user?.role === 'professeur' ? (
                  <>
                    <User className="h-4 w-4 me-2 text-blue-600" />
                    <span className="font-medium">{user.nom} {user.prenom}</span>
                  </>
                ) : (
                  <span className="text-gray-500">{t.gradeInput.notApplicable}</span>
                )}
              </div>
            </div>

            {/* Subject Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <BookOpen className="h-4 w-4 me-2 text-blue-600" />
                {t.common.subject}
              </label>
      <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <span className="font-medium">
                  {currentMatiere ? currentMatiere.nom : t.gradeInput.autoAfterSelection}
                </span>
              </div>
            </div>

            {/* Evaluation Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
<CalendarDays className="h-4 w-4 me-2 text-blue-600" /> 
                {t.gradeInput.evalDate}
              </label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="border-blue-200 focus:ring-blue-500"
              />
            </div>

            {/* Term Display */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <CalendarDays className="h-4 w-4 me-2 text-blue-600" />
                {t.common.trimester}
              </label>
      <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                <span className="font-medium">
                  {currentTrimestre?.nom || t.gradeInput.selectDateFirst}
                </span>
              </div>
            </div>

            {/* Evaluation Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                <Bookmark className="h-4 w-4 me-2 text-blue-600" />
                {t.gradeInput.evalType}
              </label>
              <Select
                onValueChange={val => setSelectedEvalTypeId(val ? Number(val) : null)}
                value={selectedEvalTypeId !== null ? String(selectedEvalTypeId) : ''}
                disabled={evaluationTypes.length === 0}
              >
                  <SelectTrigger className="w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 focus:ring-blue-500">
                  <SelectValue placeholder={t.common.selectAnOption} />
                </SelectTrigger>
                <SelectContent>
                  {evaluationTypes.length > 0 ? (
                    evaluationTypes.map(type => (
                      <SelectItem key={type.id} value={String(type.id)}>
                        {type.nom}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="disabled" disabled>
                      {t.gradeInput.selectDateFirst}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Grade Entry Section */}
        {isFormComplete ? (
          <Card className="w-full border border-blue-200 shadow-lg rounded-xl overflow-hidden">
            <CardHeader className="bg-blue-50 border-b border-blue-200 p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 me-2 " />
                <CardTitle className="text-xl font-semibold">{t.gradeInput.gradeEntry}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {loadingEleves ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-500 mr-3" />
                  <span className="text-lg text-gray-600">{t.gradeInput.loadingStudents}</span>
                </div>
              ) : eleves.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  <AlertCircle className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
                  <p className="text-lg">{t.gradeInput.noStudentsFound}</p>
                  <p className="text-sm">{t.gradeInput.checkEnrollments}</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead>{t.common.student}</TableHead>
                          <TableHead className="text-right">{t.gradeInput.gradeOutOf20}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {notes.map(noteEntry => (
                          <TableRow key={noteEntry.eleveId}>
                            <TableCell>
                              {language === 'ar' ? 
                                `${noteEntry.prenom} ${noteEntry.nom}` : 
                                `${noteEntry.nom} ${noteEntry.prenom}`
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                max="20"
                                value={noteEntry.note}
                                onChange={(e) => handleNoteChange(noteEntry.eleveId, e.target.value)}
                                className="w-24 text-right ml-auto border-gray-300 focus:border-green-500 focus:ring-green-500"
                                aria-label={`${t.gradeInput.gradeFor} ${noteEntry.nom} ${noteEntry.prenom}`}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-4 pb-[env(safe-area-inset-bottom)">
                    {notes.map(noteEntry => (
                      <Card key={noteEntry.eleveId} className="p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? 
                                `${noteEntry.prenom} ${noteEntry.nom}` : 
                                `${noteEntry.nom} ${noteEntry.prenom}`
                              }
                            </p>
                          </div>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="20"
                            value={noteEntry.note}
                            onChange={(e) => handleNoteChange(noteEntry.eleveId, e.target.value)}
                            className="w-24 text-center"
                            aria-label={`${t.gradeInput.gradeFor} ${noteEntry.nom} ${noteEntry.prenom}`}
                          />
                        </div>
                      </Card>
                    ))}
                  </div>

                  <div className="flex justify-end mt-6">
                    <Button
                      onClick={saveNotes}
                      disabled={isSaving || eleves.length === 0 || notes.some(n => n.note === '')}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 flex items-center"
                    >
                      {isSaving && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                      <Save className="me-2 h-4 w-4" />
                      {t.gradeInput.saveGrades}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
<Card className="w-full border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl overflow-hidden">
  <CardHeader className="bg-white dark:bg-gray-800 p-6">
              <div className="flex items-center space-x-3">
                <Users className="h-6 w-6 me-2" />
 <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
        {t.gradeInput.evalCriteria}
      </CardTitle>              </div>
            </CardHeader>
            <CardContent className="p-6 text-center text-gray-500">
              <AlertCircle className="h-10 w-10 mx-auto mb-4 text-gray-400" />
              <p className="text-lg">{t.gradeInput.completeCriteria}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}