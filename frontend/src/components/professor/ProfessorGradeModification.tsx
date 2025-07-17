import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, Save, Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';

// --- Interfaces ---
interface Utilisateur { id: number; nom: string; prenom: string; }
interface AnneeAcademique { id: number; libelle: string; }
interface Classe { id: number; nom: string; }
interface Matiere {
  id: number;
  nom: string;
  code?: string;
}
interface Trimestre { id: number; nom: string; }
interface Evaluation { id: number; type: string; date_eval: string; }
interface Eleve { id: number; nom: string; prenom: string; }
// Interface pour la note telle que reçue/envoyée à l'API
interface NotePayload {
  id: number;
  etudiant_id: number;
  evaluation_id: number;
  note: number | '';
  // Ajoutez ces propriétés optionnelles si elles existent dans la réponse API
  evaluation?: { id: number };
  etudiant?: { id: number };
}
interface AffectationApiResponse {
  id: number;
  professeur: Utilisateur;
  matiere: Matiere;
  classe: Classe;
  annee_scolaire: AnneeAcademique;
}
interface ProcessedAffectation {
  id: number;
  professeurId: number;
  professeurNomComplet: string;
  matiereId: number;
  matiereNom: string;
  classeId: number;
  classeNom: string;
  anneeScolaireId: number;
  anneeScolaireLibelle: string;
}
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

export function ProfessorGradeModification() {
  const { t, language } = useLanguage();
  const { user } = useAuth();

  // --- State Management ---
  const [activeAnnee, setActiveAnnee] = useState<AnneeAcademique | null>(null);
  const [processedAffectations, setProcessedAffectations] = useState<ProcessedAffectation[]>([]);
  const [allClasses, setAllClasses] = useState<Classe[]>([]);
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [notes, setNotes] = useState<Record<string, Partial<NotePayload>>>({}); // Clé: `eleveId-evaluationId`
  const [currentMatiere, setCurrentMatiere] = useState<Matiere | null>(null);
const [allMatieres, setAllMatieres] = useState<Matiere[]>([]);
  // --- Filter State ---
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  // --- UI State ---
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const configRes = await fetch(`${API_BASE_URL}/configuration`);
        const configData = await configRes.json();
        
        let anneeId: number | undefined;
        if (Array.isArray(configData) && configData.length > 0) {
          anneeId = configData[0].annee_scolaire?.id || configData[0].annee_academique_active_id;
        } else if (configData && !Array.isArray(configData)) {
          anneeId = configData.annee_scolaire?.id || configData.annee_academique_active_id;
        }

        if (!anneeId) throw new Error(t.common.missingConfig);
        
     const [anneeRes, affectationsRes, trimestresRes, allClassesRes, allMatieresRes] = await Promise.all([
        fetch(`${API_BASE_URL}/annees-academiques/${anneeId}`),
        fetch(`${API_BASE_URL}/affectations?include=professeur,matiere,classe,annee_scolaire`),
        fetch(`${API_BASE_URL}/trimestres?anneeScolaireId=${anneeId}`),
        fetch(`${API_BASE_URL}/classes`),
        fetch(`${API_BASE_URL}/matieres`), // Nouvelle requête pour les matières
      ]);
        setActiveAnnee(await anneeRes.json());

        const rawAffectations: AffectationApiResponse[] = await affectationsRes.json();
        const processed = rawAffectations.map(aff => {
          if (!aff.professeur || !aff.matiere || !aff.classe || !aff.annee_scolaire) {
            console.warn('WARN:', t.gradeInput.invalidAssignment(aff));
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

        setAllClasses(await allClassesRes.json());
        setTrimestres(await trimestresRes.json());
              setAllMatieres(await allMatieresRes.json()); // Initialisez allMatieres


      } catch (error) {
        toast({ title: t.common.error, description: (error as Error).message, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchInitialData();
  }, [user, t]);

  // --- Déterminer la matière automatiquement ---
 useEffect(() => {
  if (selectedClassId && user && activeAnnee) {
    const affectation = processedAffectations.find(
      aff => aff.classeId === parseInt(selectedClassId) && aff.professeurId === user.id && aff.anneeScolaireId === activeAnnee.id
    );

    if (affectation) {
      const matiere = allMatieres.find(m => m.id === affectation.matiereId);
      setCurrentMatiere(matiere || null);
    } else {
      setCurrentMatiere(null);
    }
  } else {
    setCurrentMatiere(null);
  }
}, [selectedClassId, user, processedAffectations, allMatieres, activeAnnee]);

  const fetchClassData = useCallback(async () => {
    if (!selectedClassId || !currentMatiere || !selectedTermId || !activeAnnee) return;
    setIsLoading(true);
    try {
      const inscriptionsRes = await fetch(`${API_BASE_URL}/inscriptions?classeId=${selectedClassId}&anneeScolaireId=${activeAnnee.id}`);
      const inscriptions = await inscriptionsRes.json();
      setEleves(inscriptions.map((i: any) => i.utilisateur));

      // Correction : Le paramètre pour filtrer par trimestre est `trimestre`.
      const evalsRes = await fetch(`${API_BASE_URL}/evaluations?classeId=${selectedClassId}&matiereId=${currentMatiere.id}&trimestre=${selectedTermId}&anneeScolaireId=${activeAnnee.id}`);
      const evalsData = await evalsRes.json();
      setEvaluations(evalsData);

      const evalIds = evalsData.map((e: Evaluation) => e.id);
      if (evalIds.length > 0) {
       const notesRes = await fetch(`${API_BASE_URL}/notes?evaluationIds=${evalIds.join(',')}`);
const notesData: NotePayload[] = await notesRes.json();
console.log('Fetched notes:', notesData); // Ajoutez ce log
        
       const notesMap = notesData.reduce((acc, apiNote) => {
  // Utilisez evaluation_id et etudiant_id directement s'ils existent,
  // sinon utilisez les valeurs nested
  const evaluationId = apiNote.evaluation_id || apiNote.evaluation?.id;
  const etudiantId = apiNote.etudiant_id || apiNote.etudiant?.id;
  
  if (evaluationId && etudiantId) {
    acc[`${etudiantId}-${evaluationId}`] = {
      id: apiNote.id,
      etudiant_id: etudiantId,
      evaluation_id: evaluationId,
      note: apiNote.note
    };
  }
  return acc;
}, {} as Record<string, NotePayload>);
        setNotes(notesMap);
      } else {
        setNotes({});
      }
    } catch (error) {
      toast({ title: t.common.error, description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, currentMatiere, selectedTermId, activeAnnee, t]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  // --- Memoized Derived Data ---
const professorClasses = useMemo(() => {
  if (!activeAnnee || !user || user.role !== 'professeur' || processedAffectations.length === 0) {
    return [];
  }

  const filteredAffectations = processedAffectations.filter(
    (aff) => aff.anneeScolaireId === activeAnnee.id && aff.professeurId === user.id
  );

  const classIdsSet = new Set(filteredAffectations.map((aff) => aff.classeId));
  const filteredClasses = allClasses.filter((cls) => classIdsSet.has(cls.id));

  return filteredClasses;
}, [activeAnnee, user, processedAffectations, allClasses]);
  // --- Event Handlers ---
  const handleGradeChange = useCallback((eleveId: number, evaluationId: number, value: string) => {
    const noteValue = parseFloat(value);
    if (value === '' || (!isNaN(noteValue) && noteValue >= 0 && noteValue <= 20)) {
      const key = `${eleveId}-${evaluationId}`;
      setNotes(prev => ({
        ...prev,
        [key]: {
          ...prev[key], // Conserve l'ID existant
          etudiant_id: eleveId,
          evaluation_id: evaluationId,
          note: value === '' ? '' : noteValue,
        }
      }));
    }
  }, []);

 const handleSaveGrades = async () => {
  setIsSaving(true);
  try {
    // Ne traiter que les notes valides et existantes (avec un ID)
    const notesToUpdate = Object.values(notes).filter(
      note => note.id && note.note !== '' && !isNaN(Number(note.note))
    );

    const promises = notesToUpdate.map(note => {
      const token = localStorage.getItem('token');
      return fetch(`${API_BASE_URL}/notes/${note.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ 
          note: Number(note.note) 
        }),
      });
    });

    const results = await Promise.all(promises);
    const failed = results.filter(res => !res.ok);

    if (failed.length > 0) {
      throw new Error(`${failed.length} notes non mises à jour`);
    }

    toast({ title: 'Succès', description: 'Notes mises à jour !' });
    fetchClassData(); // Recharge les données
  } catch (error) {
    toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
  } finally {
    setIsSaving(false);
  }
};


  const isFormComplete = selectedClassId && currentMatiere && selectedTermId;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.professorGradeView.modifyGrades}</CardTitle>
        <CardDescription>{t.professorGradeView.modifyGradesDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
              <CalendarDays className="h-4 w-4 mr-2 text-gray-500" />
              {t.common.schoolYear}
            </label>
            <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
              <span className="font-medium">
                {activeAnnee ? activeAnnee.libelle : t.common.loading}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.common.class}</label>
            <Select onValueChange={setSelectedClassId} value={selectedClassId}>
              <SelectTrigger><SelectValue placeholder={t.common.selectAClass} /></SelectTrigger>
              <SelectContent>{professorClasses.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.common.subject}</label>
            <div className="flex items-center h-10 px-3 py-2 rounded-md border bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
              <BookOpen className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium">
                {currentMatiere ? currentMatiere.nom : t.gradeInput.autoAfterSelection}
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.common.trimester}</label>
            <Select onValueChange={setSelectedTermId} value={selectedTermId} disabled={!selectedClassId}>
              <SelectTrigger><SelectValue placeholder={t.common.selectATrimester} /></SelectTrigger>
              <SelectContent>{trimestres.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nom}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : isFormComplete ? (
          evaluations.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.student}</TableHead>
                    {evaluations.map(e => <TableHead key={e.id} className="text-center">{e.type}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {eleves.map(eleve => (
                    <TableRow key={eleve.id}>
                      <TableCell>{eleve.prenom} {eleve.nom}</TableCell>
                      {evaluations.map(evaluation => {
                        const note = notes[`${eleve.id}-${evaluation.id}`];
                        return (
                          <TableCell key={evaluation.id}>
                            <Input
  type="number"
  min="0"
  max="20"
  step="0.5"
  value={notes[`${eleve.id}-${evaluation.id}`]?.note ?? ''}
  onChange={e => handleGradeChange(eleve.id, evaluation.id, e.target.value)}
  className="w-20 text-center mx-auto"
/>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end mt-6">
                <Button onClick={handleSaveGrades} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {t.common.saveChanges}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-2" />
              {t.professorGradeView.noEvaluations}
            </div>
          )
        ) : (
          <div className="text-center py-8 text-gray-500">{t.professorGradeView.selectFilters}</div>
        )}
      </CardContent>
    </Card>
  );
}
