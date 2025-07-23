import React, { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Award, Calendar, User, ArrowRightIcon, SaveIcon, ClipboardListIcon, Pencil, Trash2, Landmark, ChevronDown, Book } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CheckedState } from "@radix-ui/react-checkbox";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; 
import { useToast } from "@/components/ui/use-toast";
import { useLanguage } from '@/contexts/LanguageContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import apiClient from "@/lib/apiClient";
import { Toaster } from "sonner";

interface SchoolManagementProps {
  onNavigate: (sectionId: string) => void;
}
interface Classe {
  id: string;
  nom: string;
  niveau?: string;
  annee_scolaire_id: string;
  frais_scolarite?: number;
}

interface Matiere {
  id: string;
  nom: string;
}

interface AnneeScolaire {
  id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Coefficient {
  id: number;
  coefficient: number;
  classe: Classe;
  matiere: Matiere;
}

interface Affectation {
  id: string;
  professeur: { id: string; nom: string; prenom: string };
  matiere: Matiere;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
}

export default function SchoolManagement({ onNavigate }: SchoolManagementProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { toast } = useToast();
  
  const translateNiveau = useCallback((niveauToTranslate: string) => {
    if (!niveauToTranslate) return t.common.unknown;
    const lowerNiveau = niveauToTranslate.toLowerCase();
    switch (lowerNiveau) {
      case 'primaire': return t.schoolManagement.levels.primary;
      case 'collège':
      case 'college': return t.schoolManagement.levels.middle;
      case 'lycée':
      case 'lycee': return t.schoolManagement.levels.high;
      default: return niveauToTranslate;
    }
  }, [t]);
  
  const [activeTab, setActiveTab] = useState("annees");
  const [isAddClasseOpen, setIsAddClasseOpen] = useState(false);
  const [isAddCoeffOpen, setIsAddCoeffOpen] = useState(false);
  const [isAffectProfOpen, setIsAffectProfOpen] = useState(false);
  const [isAddAnneeOpen, setIsAddAnneeOpen] = useState(false);
  const [filterProf, setFilterProf] = useState("");
  const [filterClasse, setFilterClasse] = useState("");
  const [filterAnnee, setFilterAnnee] = useState("");
    const [useActiveYearForCoeff, setUseActiveYearForCoeff] = useState(false);

  const [coeffAnneeFilter, setCoeffAnneeFilter] = useState("");
  const [openAnnee, setOpenAnnee] = useState<string | null>(null);
  const [loadingTrimestres, setLoadingTrimestres] = useState(false);
  const [coeffData, setCoeffData] = useState<{ [matiereId: string]: number | '' }>({});
  const [anneeScolaireId, setAnneeScolaireId] = useState('');
  const [anneeScolaireFiltre, setAnneeScolaireFiltre] = useState("");
  const [currentConfiguredAcademicYearId, setCurrentConfiguredAcademicYearId] = useState<string | null>(null);
  const [anneeSelectionnee, setAnneeSelectionnee] = useState<string | null>(null);
  const [isConfirmAnneeOpen, setIsConfirmAnneeOpen] = useState(false);
  const [anneeToConfirm, setAnneeToConfirm] = useState<{ libelle: string; debut: string; fin: string } | null>(null);
  const [isConfirmTrimestresOpen, setIsConfirmTrimestresOpen] = useState(false);
  const [trimestresToConfirm, setTrimestresToConfirm] = useState<Array<{ nom: string; date_debut: string; date_fin: string }>>([]);
  const [updateAllSimilarClasses, setUpdateAllSimilarClasses] = useState(true);
  const [addGroupCoefficients, setAddGroupCoefficients] = useState(true);
  const [isDeleteAnneeDialogOpen, setIsDeleteAnneeDialogOpen] = useState(false);
  const [anneeToDelete, setAnneeToDelete] = useState<{ id: string; libelle: string } | null>(null);
  const [isEditCoeffDialogOpen, setIsEditCoeffDialogOpen] = useState(false);

  const [currentEditingCoeff, setCurrentEditingCoeff] = useState<{
    id: number;
    classeNom: string;
    matiereNom: string;
    coefficient: number | '';
    classeId?: number;
    matiereId?: number;
  } | null>(null);

  // Form states
  const [classeNom, setClasseNom] = useState("");
  const [classeNiveau, setClasseNiveau] = useState("Collège");
    const [fraisScolarite, setFraisScolarite] = useState<number | ''>('');

  const [coeffClasse, setCoeffClasse] = useState("");
  const [selectedMatieres, setSelectedMatieres] = useState<{ [id: string]: number }>({});
  const [coeffError, setCoeffError] = useState("");
  const [coeffMatiere, setCoeffMatiere] = useState("");
  const [coefficient, setCoefficient] = useState(1);
  const [openClasses, setOpenClasses] = useState<Record<string, boolean>>({});
  const [affectProf, setAffectProf] = useState("");
  const [classes, setClasses] = useState<Classe[]>([]);
const [matieres, setMatieres] = useState<Matiere[]>([]);
const [annees, setAnnees] = useState<AnneeScolaire[]>([]);
const [profs, setProfs] = useState<{ id: string; nom: string; prenom: string; role: string }[]>([]);
const [coefficients, setCoefficients] = useState<Coefficient[]>([]);
const [affectations, setAffectations] = useState<Affectation[]>([]);
  const [affectMatiere, setAffectMatiere] = useState("");
  const [affectClasses, setAffectClasses] = useState<string[]>([]);
  const [affectAnnee, setAffectAnnee] = useState("");
  const [openClasse, setOpenClasse] = useState<string | null>(null);
  const [anneeLibelle, setAnneeLibelle] = useState("");
  const [anneeDebut, setAnneeDebut] = useState("");
  const [anneeFin, setAnneeFin] = useState("");
  const [isAddTrimestreOpen, setIsAddTrimestreOpen] = useState(false);
  const [trimestre1Debut, setTrimestre1Debut] = useState("");
  const [trimestre1Fin, setTrimestre1Fin] = useState("");
  const [trimestre2Debut, setTrimestre2Debut] = useState("");
  const [trimestre2Fin, setTrimestre2Fin] = useState("");
  const [trimestre3Debut, setTrimestre3Debut] = useState("");
  const [trimestre3Fin, setTrimestre3Fin] = useState("");
  const [openNiveaux, setOpenNiveaux] = useState<Record<string, boolean>>({});
  
  const [openAnneeTrimestresId, setOpenAnneeTrimestresId] = useState<string | null>(null);
  const [trimestres, setTrimestres] = useState<{
    id: string;
    nom: string;
    date_debut: string;
    date_fin: string;
    anneeScolaire: {
      id: number;
      libelle: string;
      date_debut: string;
      date_fin: string;
    };
  }[]>([]);
 
  const getRTLStyles = (isRTL: boolean) => ({
    direction: isRTL ? 'rtl' : 'ltr',
    textAlign: isRTL ? 'right' : 'left' as const,
    flexDirection: isRTL ? 'row-reverse' : 'row' as const,
    marginStart: isRTL ? 'ml-0 mr-2' : 'mr-0 ml-2',
    transform: isRTL ? 'scaleX(-1)' : 'none'
  });
   const RTLButton = ({ children, ...props }: any) => (
    <Button {...props} className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
      {children}
    </Button>
  );

  // Composant CardTitle adapté RTL
  const RTLCardTitle = ({ children, icon: Icon, ...props }: any) => (
    <CardTitle {...props} className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center gap-2`}>
      {Icon && <Icon className="h-6 w-6" />}
      <span>{children}</span>
    </CardTitle>
  );

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    if (anneeToDelete) {
      setIsDeleteAnneeDialogOpen(true);
    }
  }, [anneeToDelete]);

  useEffect(() => {
    if (isAddClasseOpen) {
      setClasseNom("");
      setClasseNiveau(t.schoolManagement.levels.middle);
      setAnneeScolaireId("");
            setFraisScolarite('');

    }
  }, [isAddClasseOpen, t.schoolManagement.levels.middle]);
 useEffect(() => {
    if (useActiveYearForCoeff && currentConfiguredAcademicYearId) {
      setCoeffAnneeFilter(currentConfiguredAcademicYearId);
    } else if (!useActiveYearForCoeff) {
      // When unchecking, clear the filter to force a manual selection
      setCoeffAnneeFilter("");
    }
  }, [useActiveYearForCoeff, currentConfiguredAcademicYearId]);

  const filteredClassesForCoeff = useMemo(() => {
    if (!coeffAnneeFilter) {
      // Retourne un tableau vide si aucune année n'est sélectionnée pour éviter d'afficher toutes les classes
      return [];
    }
    return classes.filter(c => 
      c.annee_scolaire_id?.toString() === coeffAnneeFilter
    );
  }, [classes, coeffAnneeFilter]);

  const filteredCoefficients = useMemo(() => {
    if (!coeffAnneeFilter) {
      return coefficients;
    }
    return coefficients.filter(c => 
      c.classe?.annee_scolaire_id?.toString() === coeffAnneeFilter
    );
  }, [coefficients, coeffAnneeFilter]);

  const classesForCoeffDialog = useMemo(() => {
    if (!currentConfiguredAcademicYearId) {
      return classes;
    }
    return classes.filter(c => String(c.annee_scolaire_id) === currentConfiguredAcademicYearId);
  }, [classes, currentConfiguredAcademicYearId]);

  const formatAcademicYearDisplay = (annee: { libelle: string; date_debut?: string; date_fin?: string }): string => {
    if (!annee || !annee.date_debut || !annee.date_fin) {
      return annee?.libelle || t.schoolManagement.schoolYears.unknownYear;
    }
    const startYear = new Date(annee.date_debut).getFullYear();
    const endYear = new Date(annee.date_fin).getFullYear();
    if (annee.libelle && annee.libelle.includes(String(startYear)) && annee.libelle.includes(String(endYear))) {
      return annee.libelle;
    }
    return `${startYear}-${endYear}`;
  };

const refreshCoefficients = useCallback(() => {
  apiClient.get('/coefficientclasse?distinct=matiere_id,classe_id')
    .then(response => setCoefficients(response.data))
    .catch(error => toast({ title: t.common.error, description: error.message, variant: "destructive" }));
}, [t, toast]);
  const refreshClasses = useCallback(async () => {
    try {
      const response = await apiClient.get('/classes');
      setClasses(response.data);
    } catch (error: any) {
      toast({ title: t.common.error, description: error.message || t.common.errorLoading, variant: "destructive" });
    }
  }, [t]);

  useEffect(() => {
    const fetchData = async () => {
      try {

        await refreshClasses();

        const [
          matieresRes,
          anneesRes,
          usersRes,
          trimestresRes,
          affectationsRes,
          configRes
        ] = await Promise.all([
          apiClient.get('/matieres'),
          apiClient.get('/annees-academiques'),
          apiClient.get('/users'),
          apiClient.get('/trimestres'),
          apiClient.get('/affectations?_expand=professeur&_expand=matiere&_expand=classe&_expand=annee_scolaire'),
          apiClient.get('/configuration').catch(() => null) // Catch error if config doesn't exist
        ]);

        setMatieres(matieresRes.data);
        setAnnees(anneesRes.data);
        setProfs(usersRes.data.filter((u: any) => u.role === "professeur"));
        setTrimestres(trimestresRes.data);
        setAffectations(affectationsRes.data);

        refreshCoefficients();

        if (configRes) {
          const configData = configRes.data;
          if (configData && configData.annee_scolaire && configData.annee_scolaire.id) {
            setCurrentConfiguredAcademicYearId(String(configData.annee_scolaire.id));
          } else {
            setCurrentConfiguredAcademicYearId(null);
          }
        } else {
          setCurrentConfiguredAcademicYearId(null);
        }

      } catch (error) {
        console.error(t.common.errorLoading, error);
      }
    };

    fetchData();
  }, [t, refreshCoefficients, refreshClasses]);

  function sortAnnees(annees) {
  const order = (annee) => {
    if (annee === (isRTL ? "بكالوريا" : "Terminale")) return 99;
    if (annee === (isRTL ? "شهادة التعليم المتوسط" : "Brevet")) return 4;
    const match = annee.match(isRTL ? /السنة (\d+)/ : /^(\d+)/);
    return match ? parseInt(match[1], 10) : 100;
  };
  return Object.keys(annees).sort((a, b) => order(a) - order(b));
}

 function groupClassesByNiveauAndAnnee(classes: { id: string, nom: string, niveau?: string }[]) {
  const grouped: { [niveau: string]: { [annee: string]: { id: string, nom: string }[] } } = {};

  classes.forEach(classe => {
    const niveau = translateNiveau(classe.niveau || t.common.unknown);

    const match = classe.nom.match(/^(\d+)/);
    let annee = t.common.unknown;
    if (match) {
      if (isRTL) {
        if (match[1] === "4") {
          annee = "شهادة التعليم المتوسط";
        } else if (match[1] === "7") {
          annee = "بكالوريا";
        } else {
          annee = `السنة ${match[1]}`;
        }
      } else {
        if (match[1] === "4") {
          annee = "Brevet";
        } else if (match[1] === "7") {
          annee = "Terminale";
        } else {
          annee = `${match[1]}ème année`;
        }
      }
    }

    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(classe);
  });
  return grouped;
}
const groupCoefficientsByNiveauEtAnnee = () => {
  const grouped: Record<string, Record<string, Coefficient[]>> = {};
  
  // Utiliser un Map pour suivre les combinaisons uniques matiere-coefficient par classe
  const uniqueCoefficients = new Map<string, Coefficient>();

  filteredCoefficients.forEach(coeff => {
    const key = `${coeff.classe.id}_${coeff.matiere.id}_${coeff.coefficient}`;
    
    // Si cette combinaison existe déjà, on passe au suivant
    if (uniqueCoefficients.has(key)) return;
    uniqueCoefficients.set(key, coeff);

    const niveau = translateNiveau(coeff.classe?.niveau || t.common.unknown);
    const match = coeff.classe.nom.match(/^(\d+)/);
    let annee = t.common.unknown;
    
    if (match) {
      annee = isRTL ? 
        (match[1] === "4" ? "شهادة التعليم المتوسط" : 
         match[1] === "7" ? "بكالوريا" : `السنة ${match[1]}`) :
        (match[1] === "4" ? "Brevet" : 
         match[1] === "7" ? "Terminale" : `${match[1]}ème année`);
    }

    if (!grouped[niveau]) grouped[niveau] = {};
    if (!grouped[niveau][annee]) grouped[niveau][annee] = [];
    grouped[niveau][annee].push(coeff);
  });

  return grouped;
};

  const handleOpenEditCoefficientDialog = (coeffEntry: any) => {
    setCurrentEditingCoeff({
      id: coeffEntry.id,
      classeNom: coeffEntry.classe.nom,
      matiereNom: coeffEntry.matiere.nom,
      coefficient: coeffEntry.coefficient,
      classeId: coeffEntry.classe.id, 
      matiereId: coeffEntry.matiere.id, 
    });
    setIsEditCoeffDialogOpen(true);
  };

  const handleConfirmSaveTrimestres = async () => {
    const trimestresPayload = [
      { nom: t.schoolManagement.trimesters.trimester + " 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin, annee_scolaire_id: parseInt(anneeScolaireId) },
      { nom: t.schoolManagement.trimesters.trimester + " 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin, annee_scolaire_id: parseInt(anneeScolaireId) },
      { nom: t.schoolManagement.trimesters.trimester + " 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin, annee_scolaire_id: parseInt(anneeScolaireId) }
    ].filter(t => t.date_debut && t.date_fin);

    if (trimestresPayload.length !== 3) {
      toast({ title: t.common.error, description: t.schoolManagement.trimesters.errorMissingDates, variant: "destructive" });
      setIsConfirmTrimestresOpen(false);
      return;
    }

    try {
      const results = await Promise.all(
        trimestresPayload.map(trimestre =>
          apiClient.post('/trimestres', trimestre).then(res => res.data)
        )
      );

      setTrimestres(prev => [...prev, ...results]);
      toast({ title: t.common.success, description: t.schoolManagement.trimesters.successAdd });

      
      setTrimestre1Debut("");
      setTrimestre1Fin("");
      setTrimestre2Debut("");
      setTrimestre2Fin("");
      setTrimestre3Debut("");
      setTrimestre3Fin("");
      setAnneeLibelle("");
      setAnneeDebut("");
      setAnneeFin("");

    } catch (error: any) {
      toast({ title: t.common.error, description: `${t.schoolManagement.trimesters.errorAdd}: ${error.message || t.common.unknownError}`, variant: "destructive" });
    } finally {
      setIsConfirmTrimestresOpen(false);
      setIsAddTrimestreOpen(false);
      setTrimestresToConfirm([]);
    }
  };

  const handleConfirmSaveAnnee = async () => {
    if (!anneeToConfirm) return;

    try {
      const response = await apiClient.post('/annees-academiques', {
        libelle: anneeToConfirm.libelle,
        date_debut: anneeToConfirm.debut,
        date_fin: anneeToConfirm.fin
      });

      const newAnnee = response.data;
      setAnnees(prev => [...prev, newAnnee]);
      setAnneeScolaireId(String(newAnnee.id));
      toast({ title: t.common.success, description: t.schoolManagement.schoolYears.addDialog.successAdd });
      setIsAddAnneeOpen(false);
      setIsAddTrimestreOpen(true);
    } catch (error: any) {
      toast({ title: t.common.error, description: `${t.schoolManagement.schoolYears.addDialog.errorAdd}: ${error.message}`, variant: "destructive" });
    } finally {
      setIsConfirmAnneeOpen(false);
      setAnneeToConfirm(null);
    }
  };

  const handleDeleteAnnee = async () => {
    if (!anneeToDelete) return;

    try {
      await apiClient.delete(`/annees-academiques/${anneeToDelete.id}`);

      setAnnees(prev => prev.filter(a => a.id !== anneeToDelete.id));
      setTrimestres(prev => prev.filter(t => String(t.anneeScolaire?.id) !== anneeToDelete.id));
      setClasses(prev => prev.filter(c => c.annee_scolaire_id !== anneeToDelete.id));
      setAffectations(prev => prev.filter(aff => String(aff.annee_scolaire?.id) !== anneeToDelete.id));
      
      const remainingClassIds = new Set(classes.filter(c => c.annee_scolaire_id !== anneeToDelete.id).map(c => c.id));
      setCoefficients(prev => prev.filter(coeff => remainingClassIds.has(String(coeff.classe?.id))));

      toast({ title: t.common.success, description: t.schoolManagement.schoolYears.deleteDialog.successDelete });
    } catch (error) {
      console.error(t.schoolManagement.schoolYears.deleteDialog.errorDelete, error);
      toast({ title: t.common.error, description: error instanceof Error ? error.message : t.common.unknownError, variant: "destructive" });
    } finally {
      setIsDeleteAnneeDialogOpen(false);
      setAnneeToDelete(null);
    }
  };

  function getCoefficientsByClasse(classeId) {
    return coefficients
      .filter(c => c.classe?.id == classeId)
      .map(c => ({
        matiere: c.matiere,
        coefficient: c.coefficient
      }));
  }

  function handleAnneeCardClick(annee: { date_fin: string; date_debut: string; id: string; libelle: string; }) {
    throw new Error("Function not implemented.");
  }

  return (

<div
  className="w-full py-10 px-4"
  style={{ direction: isRTL ? 'rtl' : 'ltr', textAlign: isRTL ? 'right' : 'left' }}
>

      <div>
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-6">
            {t.schoolManagement.title}
          </h1>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 grid h-auto w-full grid-cols-2 gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 shadow dark:border-gray-700 dark:from-gray-900 dark:to-gray-800 sm:grid-cols-4 md:h-12">
            <TabsTrigger
              value="annees"
               className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} rounded-xl px-4 py-2 font-semibold transition
    text-blue-800 dark:text-blue-100
    hover:bg-blue-100 dark:hover:bg-gray-800
    data-[state=active]:bg-blue-500 data-[state=active]:text-white`}
>
              <Calendar className="h-5 w-5" /> {t.schoolManagement.tabs.schoolYears}
            </TabsTrigger>
            <TabsTrigger
              value="classes"
              className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} rounded-xl px-4 py-2 font-semibold transition
    text-blue-800 dark:text-blue-100
    hover:bg-blue-100 dark:hover:bg-gray-800
    data-[state=active]:bg-blue-500 data-[state=active]:text-white`}
>
              <Users className="h-5 w-5" /> {t.schoolManagement.tabs.classes}
            </TabsTrigger>
            <TabsTrigger
              value="coefficients"
               className={`flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} rounded-xl px-4 py-2 font-semibold transition
    text-blue-800 dark:text-blue-100
    hover:bg-blue-100 dark:hover:bg-gray-800
    data-[state=active]:bg-blue-500 data-[state=active]:text-white`}
>
              <Award className="h-5 w-5" /> {t.schoolManagement.tabs.coefficients}
            </TabsTrigger>
          <TabsTrigger
  value="affectations"
  className={`flex items-center justify-start gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} rounded-xl px-4 py-2 font-semibold transition
    text-blue-800 dark:text-blue-100
    hover:bg-blue-100 dark:hover:bg-gray-800
    data-[state=active]:bg-blue-500 data-[state=active]:text-white`}
>
  <User className="h-5 w-5" />
  {t.schoolManagement.tabs.teachers}
</TabsTrigger>



          </TabsList>

          {/* Classes Tab */}
          <TabsContent value="classes">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'} gap-2`}>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} text-blue-700 dark:text-blue-200`}>
          <Users className="h-6 w-6" />
          {t.schoolManagement.classes.title}
        </CardTitle>
        <p className={`text-sm text-blue-500 dark:text-blue-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.schoolManagement.classes.description}
        </p>
      </div>
    </CardHeader>

              <CardContent>
<div className={`mb-6 flex gap-4 rounded-xl border px-6 py-4 
  ${isRTL ? 'flex-col items-stretch' : 'flex-col md:flex-row md:items-center'} 
  bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700`}>
                  <div className="w-full md:w-auto">
                    <label htmlFor="annee-select-classes" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t.schoolManagement.classes.filterByYear}
                    </label>
                    <select
                      id="annee-select-classes"
                      value={anneeScolaireFiltre}
                      onChange={(e) => setAnneeScolaireFiltre(e.target.value)}
                      className="block w-full appearance-none rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white md:w-64"
                    >
                      <option value="">{t.common.selectAYear}</option>
                      {annees.map((a) => (
                        <option key={a.id} value={String(a.id)}>{a.libelle}</option>
                      ))}
                    </select>
                  </div>
                <Button
  className={`
    w-full md:w-auto 
    bg-gradient-to-r from-blue-500 to-indigo-500 
    text-white shadow-lg transition-transform duration-300 hover:scale-105
    flex items-center justify-center gap-2
    ${isRTL ? 'md:mr-auto' : 'md:ml-auto'}
    px-4 py-2 text-sm
  `}
  onClick={() => setIsAddClasseOpen(true)}
>
  <Plus className="h-4 w-4" />
  <span className="whitespace-nowrap">
    {t.schoolManagement.classes.addButton}
  </span>
</Button>

                </div>

                <div className="px-6">
                  {!anneeScolaireFiltre ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10 italic font-semibold">
                      {t.schoolManagement.classes.selectYearPrompt}
                    </p>
                  ) : classes.length === 0 ? (
                    <div className="text-gray-500 italic text-center py-10">
                      {t.common.noDataAvailable}
                    </div>
                  ) : (
                    (() => {
                      const classesFiltrees = classes.filter(
                        (c) => String(c.annee_scolaire_id) === anneeScolaireFiltre
                      );

                      if (classesFiltrees.length === 0) {
                        return (
                          <div className="text-red-500 font-semibold text-center py-6">
                            {t.schoolManagement.classes.noClassesForYear}
                          </div>
                        );
                      }

                      const grouped = groupClassesByNiveauAndAnnee(classesFiltrees);

                      const sortedAnneesKeys = (anneesObj) =>
                        Object.keys(anneesObj).sort();

                      return Object.entries(grouped).map(([niveau, annees]) => (
                        <div key={niveau} className={`mb-10 ${isRTL ? 'text-right' : 'text-left'}`}>
                         <h3 className={`text-xl font-bold text-blue-700 mb-4 capitalize flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
    <Users className={`h-6 w-6 ${isRTL ? 'ml-2' : 'mr-2'}`} />
    <span>{niveau}</span>
  </h3>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {sortAnnees(annees).map((annee) => (
        <div
          key={annee}
          className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-200 dark:border-blue-800 rounded-2xl shadow p-4
            transition-transform duration-300 ease-out hover:scale-105 hover:shadow-xl"
          style={{ textAlign: isRTL ? 'right' : 'left' }}
        >
          <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <Calendar className={`h-5 w-5 text-indigo-600 dark:text-indigo-300 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            <span className="text-base font-semibold text-indigo-700 dark:text-indigo-200">
              {annee}
            </span>
          </div>

           <ul className={`flex flex-wrap gap-3 ${isRTL ? 'justify-end' : 'justify-start'}`}>
            {annees[annee].map((classe) => (
              <li
                key={classe.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-900 border border-blue-100 dark:border-blue-700 shadow-sm font-semibold text-blue-900 dark:text-blue-100 text-base
                  transition-colors duration-300 ease-out hover:bg-blue-100 dark:hover:bg-blue-900 hover:scale-105 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-blue-400" style={{ [isRTL ? 'marginLeft' : 'marginRight']: '0.25rem' }} />
                {classe.nom}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  </div>
));
                    })()
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Coefficients Tab */}
<TabsContent value="coefficients">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'} gap-2`}>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} text-blue-700 dark:text-blue-200`}>
          <Award className="h-6 w-6" />
          {t.schoolManagement.coefficients.title}
        </CardTitle>
        <p className={`text-sm text-blue-500 dark:text-blue-300 ${isRTL ? 'text-right' : 'text-left'}`}>
          {t.schoolManagement.coefficients.description}
        </p>
      </div>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="w-full sm:w-auto space-y-2">
          <div>
            <Label htmlFor="coeff-annee-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.schoolManagement.coefficients.filterByYear}
            </Label>
            <Select onValueChange={setCoeffAnneeFilter} value={coeffAnneeFilter}>
              <SelectTrigger id="coeff-annee-select" className="mt-1 w-full sm:w-[250px]">
                <SelectValue placeholder={t.schoolManagement.coefficients.selectYearPrompt} />
              </SelectTrigger>
              <SelectContent>
                {annees.map((annee) => (
                  <SelectItem key={annee.id} value={String(annee.id)}>
                    {formatAcademicYearDisplay(annee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
  <Checkbox 
    id="use-active-year" 
    checked={useActiveYearForCoeff}
    onCheckedChange={(checked) => setUseActiveYearForCoeff(checked === true)}
  />
  <Label htmlFor="use-active-year">
    {t.schoolManagement.coefficients.useActiveYear}
  </Label>
</div>
        </div>

        <Button
          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-semibold shadow-lg hover:scale-105 transition"
          onClick={() => setIsAddCoeffOpen(true)}
          disabled={!currentConfiguredAcademicYearId}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t.schoolManagement.coefficients.addButton}
        </Button>
      </div>

      {filteredCoefficients.length === 0 ? (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400 italic">
          {coeffAnneeFilter 
            ? t.schoolManagement.coefficients.noCoefficientsForYear
            : t.schoolManagement.coefficients.selectYearPrompt}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupCoefficientsByNiveauEtAnnee()).map(([niveau, anneesData]) => {
            const niveauxClasses = Object.entries(anneesData);
            
            return (
              <div key={niveau} className="border rounded-lg overflow-hidden dark:border-gray-700">
                <button
                  className="w-full flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setOpenNiveaux(prev => ({
                    ...prev,
                    [niveau]: !prev[niveau]
                  }))}
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500 dark:text-blue-400" />
                    <span className="font-bold text-lg dark:text-white">{niveau}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({niveauxClasses.length} classes)
                    </span>
                  </div>
                  <ChevronDown className={`h-5 w-5 transition-transform ${openNiveaux[niveau] ? 'rotate-180' : ''} text-gray-500`} />
                </button>

                {openNiveaux[niveau] && (
                  <div className="p-4 pt-0 space-y-4">
                    {niveauxClasses.map(([annee, coefficients]) => (
                      <div key={annee} className="border rounded-lg overflow-hidden dark:border-gray-600">
                        <button
                          className="w-full flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          onClick={() => setOpenClasses(prev => ({
                            ...prev,
                            [annee]: !prev[annee]
                          }))}
                        >
                          <div className="flex items-center gap-3">
                            <Book className="h-5 w-5 text-blue-400 dark:text-blue-300" />
                            <span className="font-medium dark:text-gray-200">
                              {annee}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ({
                                // Calculer le nombre de matières uniques pour cet 'annee'
                                new Set(coefficients.map(c => c.matiere.id)).size
                              } matières)
                            </span>
                          </div>
                          <ChevronDown className={`h-5 w-5 transition-transform ${openClasses[annee] ? 'rotate-180' : ''} text-gray-500`} />
                        </button>

                        {openClasses[annee] && (
                          <div className="p-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {(() => {
                                const uniqueCoefficientsByMatiere = new Map<string, Coefficient>();
                                coefficients.forEach(coeff => {
                                  if (!uniqueCoefficientsByMatiere.has(coeff.matiere.id)) {
                                    uniqueCoefficientsByMatiere.set(coeff.matiere.id, coeff);
                                  }
                                });

                                return Array.from(uniqueCoefficientsByMatiere.values()).map((coeff) => (
                                  <div key={coeff.matiere.id} className="p-3 border rounded-lg dark:border-gray-500">
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex items-center gap-2 truncate">
                                        <Award className="h-5 w-5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                                        <span className="truncate dark:text-gray-300" title={coeff.matiere.nom}>
                                          {coeff.matiere.nom}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900 rounded-full text-xs font-bold whitespace-nowrap">
                                          {coeff.coefficient}
                                        </span>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEditCoefficientDialog(coeff)}>
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </CardContent>
  </Card>
</TabsContent>

          {/* Teacher Assignments Tab */}
          <TabsContent value="affectations">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader className="space-y-4">
      {/* Titre et bouton - alignement RTL */}
      <div className={`flex flex-col sm:flex-row justify-between items-start gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} text-blue-700 dark:text-blue-200`}>
    <User className="h-6 w-6" /> 
    {t.schoolManagement.teacherAssignments.title}
  </CardTitle>
  
  <Button
  className={`
    bg-gradient-to-r from-blue-500 to-indigo-500 
    text-white shadow-lg hover:scale-105 transition 
    flex items-center gap-2 
    ${isRTL ? 'flex-row-reverse' : 'flex-row'}
    px-4 py-2 text-sm
    whitespace-nowrap  // Empêche le texte de passer à la ligne
    w-auto            // Largeur automatique basée sur le contenu
  `}
  onClick={() => setIsAffectProfOpen(true)}
>
  <Plus className="h-4 w-4" />
  {t.schoolManagement.teacherAssignments.assignButton}
</Button>
</div>

      {/* Filtres - alignement RTL */}
      <div className={`flex flex-col sm:flex-row gap-2 w-full ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <select
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800"
          value={filterAnnee}
          onChange={e => setFilterAnnee(e.target.value)}
        >
          <option value="">{t.schoolManagement.tabs.schoolYears}</option>
          {annees.map(annee => (
            <option key={annee.id} value={annee.id}>
              {annee.libelle}
            </option>
          ))}
        </select>
        
        <select
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800"
          value={filterClasse}
          onChange={e => setFilterClasse(e.target.value)}
          disabled={!filterAnnee}
        >
          <option value="">{t.common.allClasses}</option>
          {classes
            .filter(classe => filterAnnee ? String(classe.annee_scolaire_id) === filterAnnee : true)
            .map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.nom}
              </option>
            ))}
        </select>
        
        <select
          className="w-full rounded-lg border border-blue-300 bg-white px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-blue-300 dark:border-blue-700 dark:bg-gray-800"
          value={filterProf}
          onChange={e => setFilterProf(e.target.value)}
        >
          <option value="">{t.common.teachers}</option>
          {profs.map(prof => (
            <option key={prof.id} value={prof.id}>
              {prof.nom} {prof.prenom}
            </option>
          ))}
        </select>
      </div>
    </CardHeader>

    <CardContent>
      {(() => {
        if (!filterAnnee) {
          return (
            <div className="italic text-gray-500 dark:text-gray-400 text-center py-8">
              {t.schoolManagement.teacherAssignments.selectYearPrompt}
            </div>
          );
        }

        function groupAffectationsByProf(affectations: Affectation[]) {
  const grouped: Record<string, {
    professeur: { id: string; nom: string; prenom: string };
    matieres: Record<string, {
      matiere: Matiere;
      classes: Classe[];
      annee: AnneeScolaire;
    }>;
  }> = {};

  affectations.forEach(aff => {
    const profId = aff.professeur?.id;
    if (!profId) return;

    if (!grouped[profId]) {
      grouped[profId] = {
        professeur: aff.professeur,
        matieres: {},
      };
    }

    const matiereId = aff.matiere?.id;
    if (!matiereId) return;

    if (!grouped[profId].matieres[matiereId]) {
      grouped[profId].matieres[matiereId] = {
        matiere: aff.matiere,
        classes: [],
        annee: aff.annee_scolaire,
      };
    }

    if (aff.classe) {
      grouped[profId].matieres[matiereId].classes.push(aff.classe);
    }
  });

  return grouped;
}

        const filteredAffectations = affectations.filter(aff =>
          (!filterProf || aff.professeur?.id == filterProf) &&
          (!filterClasse || aff.classe?.id == filterClasse) &&
          (!filterAnnee || aff.annee_scolaire?.id == filterAnnee)
        );
        const grouped = groupAffectationsByProf(filteredAffectations);

        type ProfGroup = {
          professeur: { id: string; nom: string; prenom: string };
          matieres: {
            [matiereId: string]: {
              matiere: { id: string; nom: string };
              classes: { id: string; nom: string }[];
              annee: { id: string; libelle: string };
            };
          };
        };
        const profGroups = Object.values(grouped) as ProfGroup[];
        return profGroups.length === 0 ? (
          <div className="italic text-gray-500 dark:text-gray-400 text-center py-8">
            {t.schoolManagement.teacherAssignments.noAssignmentsFound}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {profGroups.map(profGroup => (
              <div
                key={profGroup.professeur.id}
                className={`p-6 rounded-2xl bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-800 shadow-lg
                  transition-all duration-300 ease-out hover:scale-[1.02] hover:shadow-xl ${isRTL ? 'text-right' : 'text-left'}`}
                style={{ animation: "fadeIn 0.7s" }}
              >
                <div className={`flex items-center gap-4 mb-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className="rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 text-white w-14 h-14 flex items-center justify-center text-2xl font-bold uppercase shadow-lg border-4 border-white">
                    {profGroup.professeur.nom[0]}
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <div className="font-extrabold text-blue-900 dark:text-blue-100 text-xl tracking-wide">
                      {profGroup.professeur.nom} {profGroup.professeur.prenom}
                    </div>
                    <div className={`text-xs text-blue-500 dark:text-blue-300 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                      <User className="h-4 w-4" /> {t.common.teacher}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  {Object.values(profGroup.matieres).map(mg => (
                    <div key={mg.matiere.id} className={`flex flex-col sm:flex-row gap-2 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'} sm:items-center`}>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-sm font-semibold shadow ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                        <Award className="h-4 w-4" /> {mg.matiere.nom}
                      </span>
                      <span className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                        {mg.classes.map(c => (
                          <span
                            key={c.id}
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-medium shadow ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
                          >
                            <Users className="h-3 w-3" /> {c.nom}
                          </span>
                        ))}
                      </span>
                      {mg.annee && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-semibold shadow ${isRTL ? 'flex-row-reverse mr-2' : 'flex-row ml-2'}`}>
                          <Calendar className="h-3 w-3" /> {mg.annee.libelle}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()}
    </CardContent>
  </Card>
</TabsContent>

          {/* School Years Tab */}
          <TabsContent value="annees">
  <Card className="bg-white/90 dark:bg-gray-900/90 rounded-3xl shadow-xl border-2 border-blue-100 dark:border-blue-900">
    <CardHeader>
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'} text-blue-700 dark:text-blue-200`}>
          <Calendar className="h-6 w-6" />
          {t.schoolManagement.schoolYears.title}
        </CardTitle>
        
        <Button
          className={`bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:scale-105 transition
                     flex items-center gap-2 px-4 py-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          onClick={() => setIsAddAnneeOpen(true)}
        >
          <Plus className="h-4 w-4" />
          {t.schoolManagement.schoolYears.addButton}
        </Button>
      </div>
      
      <p className={`text-sm text-blue-500 dark:text-blue-300 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
        {t.schoolManagement.schoolYears.description}
      </p>
    </CardHeader>

    <CardContent>
      {annees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 dark:text-gray-400 select-none">
          <Calendar className="mb-5 w-12 h-12 text-gray-400" />
          <p className="text-lg italic font-light">{t.schoolManagement.schoolYears.noYearsFound}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
          {annees.map((annee) => {
            const isOpen = openAnneeTrimestresId === annee.id;
            const trimestresAnnee = trimestres.filter(
              (t) => t.anneeScolaire?.id === parseInt(annee.id)
            );

            return (
              <li
                key={annee.id}
                className={`relative flex flex-col bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-3xl shadow-md hover:shadow-xl transition-shadow duration-300 focus:outline-none focus:ring-4 focus:ring-blue-400 cursor-pointer ${
                  isOpen ? "ring-2 ring-blue-500" : ""
                }`}
                tabIndex={0}
                role="button"
                onClick={() => setOpenAnneeTrimestresId(isOpen ? null : annee.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpenAnneeTrimestresId(isOpen ? null : annee.id);
                  }
                }}
                aria-label={`${t.schoolManagement.schoolYears.academicYear} ${annee.libelle}`}
                aria-expanded={isOpen}
              >
                <header className={`flex items-center justify-between px-6 pt-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                    <span className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-600 text-white text-2xl shadow-lg">
                      <Calendar className="w-8 h-8" />
                    </span>
                    <h3 className={`text-xl font-semibold text-gray-900 dark:text-gray-100 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                      {annee.libelle}
                    </h3>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAnneeToDelete({ id: annee.id, libelle: annee.libelle });
                    }}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </header>

                <div className={`flex items-center justify-between px-6 pb-6 gap-6 mt-4 border-t border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1">
                      {t.common.startDate}
                    </span>
                    <time
                      dateTime={annee.date_debut}
                      className="text-base font-medium text-gray-800 dark:text-gray-200"
                    >
                      {new Date(annee.date_debut).toLocaleDateString(language, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>

                  <ArrowRightIcon className={`h-7 w-7 text-blue-500 dark:text-blue-400 ${isRTL ? 'transform rotate-180' : ''}`} />

                  <div className={`flex flex-col ${isRTL ? 'text-right' : 'text-left'}`}>
                    <span className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-1">
                      {t.common.endDate}
                    </span>
                    <time
                      dateTime={annee.date_fin}
                      className="text-base font-medium text-gray-800 dark:text-gray-200"
                    >
                      {new Date(annee.date_fin).toLocaleDateString(language, {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </time>
                  </div>
                </div>

                {isOpen && (
                  <div className={`px-6 pb-6 -mt-2 border-t border-blue-100 dark:border-blue-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <h4 className="text-md font-semibold text-blue-800 dark:text-blue-200 mt-4 mb-3">
                      {t.schoolManagement.trimesters.title}
                    </h4>
                    {trimestresAnnee.length === 0 ? (
                      <div className="text-sm italic text-gray-500 dark:text-gray-400">
                        {t.schoolManagement.trimesters.noTrimestersDefined}
                      </div>
                    ) : (
                      <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        {trimestresAnnee.map((trimestre) => (
                          <li key={trimestre.id} className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                            <ArrowRightIcon className={`h-4 w-4 text-green-600 dark:text-green-300 ${isRTL ? 'transform rotate-180' : ''}`} />
                            <span className="font-medium">{trimestre.nom}</span> : {t.common.from}{" "}
                            {new Date(trimestre.date_debut).toLocaleDateString(language)} {t.common.to}{" "}
                            {new Date(trimestre.date_fin).toLocaleDateString(language)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
  </Card>
</TabsContent>
        </Tabs>
      </div>

      {/* Add Class Dialog */}
      <Dialog open={isAddClasseOpen} onOpenChange={setIsAddClasseOpen}>
        <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-2xl border-2 border-blue-300 bg-white p-0 shadow-2xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-lg">
          <DialogHeader className="p-6">
            <DialogTitle className="text-center text-2xl font-bold text-gray-800 dark:text-white">
              {t.schoolManagement.classes.addDialog.title}
            </DialogTitle>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {t.schoolManagement.classes.addDialog.description}
            </p>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              
              const response = await apiClient.post('/classes', {
                nom: classeNom,
                niveau: classeNiveau,
                anneeScolaireId,
                frais_scolarite: Number(fraisScolarite)
              });

              const nouvelleClasse = response.data;

              let message = t.schoolManagement.classes.successAdd;

              if (["collège", "lycée"].includes(classeNiveau.toLowerCase())) {
                const prefixe = classeNom.match(/^\d+/)?.[0];

                if (prefixe) {
                 const classeExistante = classes.find(
      (c) => 
        c.nom.startsWith(prefixe) && 
        c.nom !== classeNom && 
        String(c.annee_scolaire_id) === String(anneeScolaireId)
    );

                  if (classeExistante) {
                    try {
                      await apiClient.post('/coefficientclasse/clone', {
                        fromClasseId: String(classeExistante.id),
                        toClasseId: String(nouvelleClasse.id),
                      });
                      message = t.schoolManagement.classes.successAddWithCoefficients;
                      refreshCoefficients();
                    } catch (cloneError: any) {
                      toast({ title: t.common.warning, description: `${t.schoolManagement.classes.successAdd} ${t.schoolManagement.coefficients.errorCloning}: ${cloneError.message}` });
                    }
                  }
                }
              }

              // Rafraîchit la liste complète des classes depuis le serveur pour refléter les changements.
              await refreshClasses();
              setClasseNom("");
              setClasseNiveau("Primaire");
                            setFraisScolarite('');
              setIsAddClasseOpen(false);
              
              toast({ title: t.common.success, description: message });
            }}
            className="space-y-6 p-6"
          >
            <fieldset className="border border-blue-200 dark:border-blue-800 rounded-xl p-6 space-y-5 bg-gray-50 dark:bg-gray-800/50">
              <legend className="text-lg font-medium text-blue-700 dark:text-blue-300 px-2">
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t.schoolManagement.classes.addDialog.personalInfo}
                </span>
              </legend>

              <div className="space-y-3">
                <label htmlFor="classeNom" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t.schoolManagement.classes.addDialog.nameLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="classeNom"
                    value={classeNom}
                    onChange={(e) => setClasseNom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white pl-11"
                    placeholder={t.schoolManagement.classes.addDialog.namePlaceholder}
                    required
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <label htmlFor="anneeScolaire" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t.schoolManagement.schoolYears.title} <span className="text-red-500">*</span>
                </label>
                <select
                  id="anneeScolaire"
                  value={anneeScolaireId}
                  onChange={(e) => setAnneeScolaireId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">{t.common.selectAYear}</option>
                  {annees.map((annee) => (
                    <option key={annee.id} value={annee.id}>
                      {annee.libelle}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-3">
                <label htmlFor="fraisScolarite" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Frais de scolarité (MRU) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="fraisScolarite"
                    type="number"
                    value={fraisScolarite}
                    onChange={(e) => setFraisScolarite(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white pl-11"
                    placeholder="5000"
                    required
                    min="0"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Landmark className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  {t.schoolManagement.classes.addDialog.levelLabel} <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {t.schoolManagement.classes.levelOptions.filter(niveau => niveau !== t.schoolManagement.levels.primary).map((niveau) => (
                    <button
                      key={niveau}
                      type="button"
                      onClick={() => setClasseNiveau(niveau)}
                      className={`px-4 py-3 rounded-xl font-medium border flex items-center justify-center gap-2 transition-all ${
                        classeNiveau === niveau
                          ? "bg-blue-600 text-white border-blue-600 shadow-md"
                          : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700"
                      }`}
                    >
                      {niveau}
                    </button>
                  ))}
                </div>
              </div>
            </fieldset>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setIsAddClasseOpen(false)}
                className="px-5 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-medium flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t.common.cancel}
              </button>
              <Button
                type="submit"
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t.schoolManagement.classes.addDialog.createButton}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Coefficient Dialog */}
      <Dialog open={isAddCoeffOpen} onOpenChange={setIsAddCoeffOpen}>
        <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-lg border-2 border-blue-300 bg-white p-0 shadow-xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-4xl">
          <DialogHeader className="p-6">
            <div className="flex items-center justify-center mb-2">
              <DialogTitle className="text-center text-2xl font-bold text-blue-700 dark:text-blue-300">
                {t.schoolManagement.coefficients.dialogTitle}
              </DialogTitle>
            </div>
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              {t.schoolManagement.coefficients.dialogDescription}
            </p>
          </DialogHeader>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              setCoeffError("");

              if (!coeffClasse || Object.keys(coeffData).length === 0) {
                setCoeffError(t.schoolManagement.coefficients.errorRequiredFields);
                return;
              }

              const coefficientsPayload = Object.entries(coeffData)
                .filter(([_, coefficient]) => coefficient !== '' && !isNaN(Number(coefficient)))
                .map(([matiere_id, coefficient]) => ({
                  matiere_id: Number(matiere_id),
                  coefficient: Number(coefficient),
                }));

              if (coefficientsPayload.length === 0) {
                setCoeffError(t.schoolManagement.coefficients.errorInvalidCoefficients);
                return;
              }

              try {
                if (addGroupCoefficients) {
                  await apiClient.post('/coefficientclasse/create-group', {
                    classe_id: Number(coeffClasse),
                    coefficients: coefficientsPayload,
                  });
                  toast({ title: t.common.success, description: t.schoolManagement.coefficients.successAddGroup });
                } else {
                  const simplePayload = coefficientsPayload.map(c => ({
                    ...c,
                    classe_id: Number(coeffClasse),
                  }));
                  await apiClient.post('/coefficientclasse', simplePayload);
                  toast({ title: t.common.success, description: t.schoolManagement.coefficients.successAdd });
                }

                setIsAddCoeffOpen(false);
                setCoeffClasse("");
                setCoeffData({});
                refreshCoefficients();
              } catch (error) {
                const errorMessage = (error as any).response?.data?.message || (error as Error).message || t.common.unknownError;
                setCoeffError(errorMessage);
              }
            }} 
            className="space-y-6 p-6"
          >
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                {t.schoolManagement.coefficients.selectClassTitle}
              </h3>
              {!currentConfiguredAcademicYearId && (
                <div className="mb-3 p-2 bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded-md text-xs">
                  {t.schoolManagement.coefficients.noActiveYearWarning}
                  <button
                    type="button"
                    onClick={() => onNavigate('settings')}
                    className="underline font-semibold ml-1 text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {t.schoolManagement.coefficients.configureYearLink}
                  </button>.
                </div>
              )}
              <select
                value={coeffClasse}
                onChange={(e) => setCoeffClasse(e.target.value)}
                className="w-full rounded-lg border-2 border-blue-300 dark:border-blue-700 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">{t.schoolManagement.coefficients.selectClassPlaceholder}</option>
                {currentConfiguredAcademicYearId && classesForCoeffDialog.length === 0 ? (
                  <option value="" disabled>{t.schoolManagement.coefficients.noClassesForYear}</option>
                ) : (
                  classesForCoeffDialog.map((classe) => (
                    <option key={classe.id} value={classe.id}>
                      {classe.nom} ({annees.find(a => a.id === classe.annee_scolaire_id)?.libelle || t.common.unknown})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                <ClipboardListIcon className="h-5 w-5 mr-2" />
                {t.schoolManagement.coefficients.assignCoefficientsTitle}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t.schoolManagement.coefficients.assignCoefficientsDescription}
              </p>

              {coeffClasse && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(() => {
                    const existingCoeffsForSelectedClass = coefficients.filter(
                      (c: any) => String(c.classe?.id) === String(coeffClasse)
                    );
                    const existingMatiereIdsForSelectedClass = existingCoeffsForSelectedClass.map(
                      (c: any) => String(c.matiere.id)
                    );
                    
                    const availableMatieresForAdding = matieres.filter(
                      (m) => !existingMatiereIdsForSelectedClass.includes(String(m.id))
                    );

                    if (availableMatieresForAdding.length === 0 && coeffClasse) {
                      return <p className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400 p-4">{t.schoolManagement.coefficients.allSubjectsHaveCoefficients}</p>;
                    }

                    return availableMatieresForAdding.map((matiere) => {
                      const isSelected = coeffData[matiere.id] !== undefined;
                      return (
                        <div
  key={matiere.id}
  className={`border-2 p-3 rounded-xl transition-all duration-200 ease-in-out flex items-center justify-between cursor-pointer
    ${
      isSelected
        ? "border-blue-500 bg-blue-100 dark:bg-blue-800 shadow-md"
        : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-blue-400"
    }`}
  onClick={() => {
    if (isSelected) {
      const updated = { ...coeffData };
      delete updated[matiere.id];
      setCoeffData(updated);
    } else {
      setCoeffData({ ...coeffData, [matiere.id]: 1 });
    }
  }}
>
  <div className="flex items-center min-w-0"> {/* Ajout de min-w-0 */}
    <div className={`w-3 h-3 rounded-full mr-3 ${isSelected ? 'bg-blue-600' : 'bg-gray-400'}`} />
    <span className="font-medium text-gray-900 dark:text-gray-100 truncate"> {/* Ajout de truncate */}
      {matiere.nom}
    </span>
  </div>
  {isSelected && (
    <div className="flex items-center ml-2"> {/* Ajout de ml-2 */}
      <span className="text-sm text-gray-600 dark:text-gray-400 mr-2 whitespace-nowrap"> {/* Ajout de whitespace-nowrap */}
        {t.schoolManagement.coefficients.coefficient}:
      </span>
      <input
        type="number"
        value={coeffData[matiere.id]}
        onChange={(e) => {
          const value = e.target.value;
          setCoeffData({ ...coeffData, [matiere.id]: value === '' ? '' : parseFloat(value) });
        }}
        className="w-16 border border-blue-300 dark:border-blue-700 rounded-md px-2 py-1 text-center text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
        min="1" step="1"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )}
</div>
                      );
                    });
                  })()}
                </div>
              )}
              {!coeffClasse && (
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 p-4">{t.schoolManagement.coefficients.selectClassFirst}</p>
              )}
            </div>

            <div className={`flex items-center gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Checkbox
                id="add-group-coeffs"
                checked={addGroupCoefficients}
                onCheckedChange={(checked: CheckedState) => setAddGroupCoefficients(checked === true)}
              />
              <label
                htmlFor="add-group-coeffs"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t.schoolManagement.coefficients.addAllSimilarClassesLabel}
              </label>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                onClick={() => setIsAddCoeffOpen(false)}
                className="text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition flex items-center"
              >
                <SaveIcon className="h-5 w-5 mr-2" />
                {t.common.save}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Coefficient Dialog */}
      <Dialog open={isEditCoeffDialogOpen} onOpenChange={(isOpen) => {
        setIsEditCoeffDialogOpen(isOpen);
        if (isOpen) {
          setUpdateAllSimilarClasses(true); // Réinitialiser à coché par défaut
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t.schoolManagement.coefficients.editDialogTitle}</DialogTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t.schoolManagement.classes.title}: {currentEditingCoeff?.classeNom} <br />
              {t.common.subject}: {currentEditingCoeff?.matiereNom}
            </p>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!currentEditingCoeff || currentEditingCoeff.coefficient === '' || isNaN(Number(currentEditingCoeff.coefficient))) {
                toast({ title: t.common.error, description: t.schoolManagement.coefficients.errorInvalidCoefficient, variant: "destructive" });
                return;
              }

              try {
                if (updateAllSimilarClasses && currentEditingCoeff.classeId && currentEditingCoeff.matiereId) {
                  await apiClient.put(`/coefficientclasse/update-group`, {
                    classeId: currentEditingCoeff.classeId,
                    matiereId: currentEditingCoeff.matiereId,
                    coefficient: Number(currentEditingCoeff.coefficient),
                  });
                  toast({ title: t.common.success, description: t.schoolManagement.coefficients.successUpdateGroup });
                } else {
                  await apiClient.put(`/coefficientclasse/${currentEditingCoeff.id}`, {
                    coefficient: Number(currentEditingCoeff.coefficient)
                  });
                  toast({ title: t.common.success, description: t.schoolManagement.coefficients.successUpdate });
                }
                refreshCoefficients();
                setIsEditCoeffDialogOpen(false);
                setCurrentEditingCoeff(null);
              } catch (error: any) {
                toast({ title: t.common.error, description: error.message || t.common.unknownError, variant: "destructive" });
              }
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="editCoefficientValue" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                {t.schoolManagement.coefficients.newCoefficient}
              </label>
              <Input
                id="editCoefficientValue"
                type="number"
                value={currentEditingCoeff?.coefficient ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setCurrentEditingCoeff(prev => prev ? { ...prev, coefficient: value === '' ? '' : parseFloat(value) } : null)
                }}
                className="mt-1 block w-full"
                min="1"
                step="1"
                required
              />
            </div>
            <div className={`flex items-center gap-2 pt-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <Checkbox
                id="update-all-classes"
                checked={updateAllSimilarClasses}
                onCheckedChange={(checked: CheckedState) => setUpdateAllSimilarClasses(checked === true)}
              />
              <label
                htmlFor="update-all-classes"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t.schoolManagement.coefficients.updateAllSimilarClassesLabel}
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditCoeffDialogOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit">{t.common.save}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Teacher Dialog */}
      <Dialog open={isAffectProfOpen} onOpenChange={setIsAffectProfOpen}>
        <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-lg border-2 border-blue-300 bg-white p-0 shadow-xl dark:border-blue-800 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-md">
          <DialogHeader className="p-6">
            <DialogTitle className="text-xl font-semibold text-blue-700 dark:text-blue-300 text-center">
              {t.schoolManagement.teacherAssignments.assignDialogTitle}
            </DialogTitle>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              {t.schoolManagement.teacherAssignments.assignDialogDescription}
            </p>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!affectProf || !affectMatiere || affectClasses.length === 0 || !affectAnnee) {
                toast({
                  title: t.common.error,
                  description: t.common.requiredFieldsError,
                  variant: "destructive",
                });
                return;
              }

              const affectationPromises = affectClasses.map(classeId => {
                return apiClient.post('/affectations', {
                  professeur_id: affectProf,
                  matiere_id: affectMatiere,
                  classe_id: classeId,
                  annee_id: affectAnnee,
                }).then(res => res.data);
              });

              Promise.all(affectationPromises)
                .then(newAffectations => {
                  setAffectations([...affectations, ...newAffectations]);
                  setAffectProf("");
                  setAffectMatiere("");
                  setAffectClasses([]);
                  setAffectAnnee("");
                  setIsAffectProfOpen(false);
                  toast({ title: t.common.success, description: t.schoolManagement.teacherAssignments.successAssign });
                })
                .catch(error => {
                  console.error(t.common.error, error);
                  toast({
                    title: t.common.error,
                    description: (error as Error).message || t.common.unknownError,
                    variant: "destructive",
                  });
                });
            }}
            className="space-y-4 p-6"
          >
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.teacher} <span className="text-red-500">*</span>
              </label>
              <select
                value={affectProf}
                onChange={(e) => setAffectProf(e.target.value)}
                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                required
              >
                <option value="">{t.common.selectATeacher}</option>
                {profs.map(prof => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nom} {prof.prenom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.subject} <span className="text-red-500">*</span>
              </label>
              <select
                value={affectMatiere}
                onChange={(e) => setAffectMatiere(e.target.value)}
                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                required
              >
                <option value="">{t.common.selectASubject}</option>
                {matieres.map(matiere => (
                  <option key={matiere.id} value={matiere.id}>
                    {matiere.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.schoolManagement.schoolYears.title} <span className="text-red-500">*</span>
              </label>
              <select
                value={affectAnnee}
                onChange={(e) => {
                  setAffectAnnee(e.target.value);
                  setAffectClasses([]);
                }}
                className="w-full rounded-lg border border-blue-300 dark:border-blue-700 px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
                required
              >
                <option value="">{t.common.selectAYear}</option>
                {annees.map(annee => (
                  <option key={annee.id} value={annee.id}>
                    {annee.libelle}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.schoolManagement.tabs.classes} <span className="text-red-500">*</span>
              </label>
              <div className="border border-blue-300 dark:border-blue-700 rounded-lg bg-white dark:bg-gray-800 p-2 max-h-48 overflow-y-auto shadow-inner">
                {(affectAnnee
                  ? classes.filter(classe => classe.annee_scolaire_id.toString() === affectAnnee)
                  : []
                ).map(classe => (
                  <div 
                    key={classe.id}
                    className={`flex items-center p-2 rounded-md mb-1 cursor-pointer transition-colors duration-150 ${
                      affectClasses.includes(classe.id) 
                        ? 'bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 border border-transparent'
                    }`}
                    onClick={() => {
                      if (affectClasses.includes(classe.id)) {
                        setAffectClasses(affectClasses.filter(id => id !== classe.id));
                      } else {
                        setAffectClasses([...affectClasses, classe.id]);
                      }
                    }}
                  >
                    <div className={`flex items-center justify-center h-5 w-5 rounded border ${
                      affectClasses.includes(classe.id)
                        ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {affectClasses.includes(classe.id) && (
                        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="ml-3 text-gray-900 dark:text-gray-100">
                      {classe.nom}
                    </span>
                  </div>
                ))}
              </div>
              {affectClasses.length > 0 ? (
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  {affectClasses.length} {t.schoolManagement.classes.selectedCount}
                </p>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {affectAnnee ? t.schoolManagement.classes.noClassesSelected : t.schoolManagement.teacherAssignments.selectYearFirst}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                onClick={() => setIsAffectProfOpen(false)}
                className="px-4 py-2 rounded-lg text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                variant="outline"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 flex items-center gap-1"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t.schoolManagement.teacherAssignments.validateButton}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Academic Year Dialog */}
      <Dialog open={isAddAnneeOpen || isAddTrimestreOpen} onOpenChange={open => {
        setIsAddAnneeOpen(open);
        setIsAddTrimestreOpen(false);
      }}>
        <DialogContent className="h-full w-full max-h-screen overflow-y-auto rounded-2xl border-2 border-blue-300 bg-white p-0 shadow-2xl dark:border-blue-900 dark:bg-gray-900 sm:h-auto sm:max-h-[90vh] sm:max-w-xl">
          <DialogHeader className="p-6">
            <DialogTitle className="text-center text-xl text-blue-700 dark:text-blue-200">
              {isAddAnneeOpen ? t.schoolManagement.schoolYears.addDialog.step1Title : t.schoolManagement.schoolYears.addDialog.step2Title}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${isAddAnneeOpen ? 'bg-blue-600' : 'bg-green-500'}`}>1</div>
              <span className={`${isAddAnneeOpen ? 'text-blue-600' : 'text-gray-400'}`}>{t.schoolManagement.schoolYears.title}</span>
            </div>
            <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-indigo-500 mx-2" />
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full text-white flex items-center justify-center font-bold ${isAddTrimestreOpen ? 'bg-blue-600' : 'bg-gray-400'}`}>2</div>
              <span className={`${isAddTrimestreOpen ? 'text-blue-600' : 'text-gray-400'}`}>{t.schoolManagement.trimesters.title}</span>
            </div>
          </div>

          {isAddAnneeOpen && (
            <form
              onSubmit={async e => {
                e.preventDefault();
                setAnneeToConfirm({ libelle: anneeLibelle, debut: anneeDebut, fin: anneeFin });
                setIsConfirmAnneeOpen(true);  
              }} 
              className="space-y-6 p-6"
            >
              <fieldset className="border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                <legend className="text-lg font-semibold text-blue-700 dark:text-blue-300 px-2">
                  {t.schoolManagement.schoolYears.addDialog.infoTitle}
                </legend>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      {t.schoolManagement.schoolYears.addDialog.labelField}
                    </label>
                    <input
                      type="text"
                      placeholder={t.schoolManagement.schoolYears.addDialog.labelPlaceholder}
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      value={anneeLibelle}
                      onChange={e => setAnneeLibelle(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      {t.common.startDate}
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      value={anneeDebut}
                      onChange={e => setAnneeDebut(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                      {t.common.endDate}
                    </label>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                      value={anneeFin}
                      onChange={e => setAnneeFin(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </fieldset>

              <Button type="submit" className="btn-primary w-full text-white font-bold py-2">
                {t.schoolManagement.schoolYears.addDialog.continueButton}
              </Button>
            </form>
          )}

          {isAddTrimestreOpen && (
            <form
              onSubmit={async e => {
                e.preventDefault();
                const allTrimestres = [
                  { nom: t.schoolManagement.trimesters.trimester + " 1", date_debut: trimestre1Debut, date_fin: trimestre1Fin, annee_scolaire_id: anneeScolaireId },
                  { nom: t.schoolManagement.trimesters.trimester + " 2", date_debut: trimestre2Debut, date_fin: trimestre2Fin, annee_scolaire_id: anneeScolaireId },
                  { nom: t.schoolManagement.trimesters.trimester + " 3", date_debut: trimestre3Debut, date_fin: trimestre3Fin, annee_scolaire_id: anneeScolaireId }
                ];

                setTrimestresToConfirm(allTrimestres.map(t => ({ nom: t.nom, date_debut: t.date_debut, date_fin: t.date_fin })));
                setIsConfirmTrimestresOpen(true);
              }} 
              className="space-y-6 p-6"
            >
              {[1, 2, 3].map(i => (
                <fieldset
                  key={i}
                  className="border border-blue-200 dark:border-blue-800 rounded-xl p-4"
                >
                  <legend className="text-lg font-semibold text-blue-700 dark:text-blue-300 px-2">
                    {t.schoolManagement.trimesters.trimester} {i}
                  </legend>

                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        {t.common.startDate}
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        value={eval(`trimestre${i}Debut`)}
                        onChange={e => eval(`setTrimestre${i}Debut(e.target.value)`)}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        {t.common.endDate}
                      </label>
                      <input
                        type="date"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                        value={eval(`trimestre${i}Fin`)}
                        onChange={e => eval(`setTrimestre${i}Fin(e.target.value)`)}
                        required
                      />
                    </div>
                  </div>
                </fieldset>
              ))}

              <Button type="submit" className="btn-primary w-full text-white font-bold py-2">
                {t.schoolManagement.trimesters.saveButton}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
 
      {/* Delete Year Dialog */}
      <Dialog open={isDeleteAnneeDialogOpen} onOpenChange={(isOpen) => {
        setIsDeleteAnneeDialogOpen(isOpen);
        if (!isOpen) setAnneeToDelete(null);
      }}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl animate-fade-in-up bg-red-50 dark:bg-red-900">
          <DialogHeader className="bg-gradient-to-r from-red-600 to-red-400 text-white p-6 pb-4">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">
              {t.schoolManagement.schoolYears.deleteDialog.title}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-4 text-gray-800 dark:text-gray-200">
            <p className="text-lg font-semibold text-red-700 dark:text-red-200">
              {t.schoolManagement.schoolYears.deleteDialog.confirmationQuestion} <span className="font-bold">{anneeToDelete?.libelle}</span> ?
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {t.schoolManagement.schoolYears.deleteDialog.warningMessage}
            </p>
          </div>
          <DialogFooter className="flex justify-end gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t">
            <Button variant="outline" onClick={() => setIsDeleteAnneeDialogOpen(false)} className="px-5 py-2.5 text-base rounded-md">
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleDeleteAnnee}
              className="px-5 py-2.5 text-base rounded-md bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {t.schoolManagement.schoolYears.deleteDialog.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Year Dialog */}
      <Dialog open={isConfirmAnneeOpen} onOpenChange={setIsConfirmAnneeOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-xl animate-fade-in-up bg-blue-50 dark:bg-blue-900">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 pb-4">
            <DialogTitle className="text-2xl font-extrabold tracking-tight">{t.schoolManagement.schoolYears.addDialog.confirmTitle}</DialogTitle>
          </DialogHeader>
          {anneeToConfirm && (
            <div className="p-6 space-y-4 text-gray-800 dark:text-gray-200">
              <div className="flex justify-between">
                <span className="font-medium">{t.schoolManagement.schoolYears.addDialog.labelField}:</span>
                <span>{anneeToConfirm.libelle}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{t.common.startDate}:</span>
                <span>{new Date(anneeToConfirm.debut).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{t.common.endDate}:</span>
                <span>{new Date(anneeToConfirm.fin).toLocaleDateString()}</span>
              </div>
            </div>
          )}
          <DialogFooter className="flex justify-end gap-3 p-6 bg-gray-50 dark:bg-gray-900 border-t">
            <Button variant="outline" onClick={() => setIsConfirmAnneeOpen(false)} className="px-5 py-2.5 text-base rounded-md">
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleConfirmSaveAnnee}
              className="px-5 py-2.5 text-base rounded-md bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              {t.schoolManagement.schoolYears.addDialog.confirmButton}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Trimesters Dialog */}
      <Dialog open={isConfirmTrimestresOpen} onOpenChange={setIsConfirmTrimestresOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">{t.schoolManagement.trimesters.confirmDialog.title}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
              {t.schoolManagement.trimesters.confirmDialog.description}
            </DialogDescription>
          </DialogHeader>
          {trimestresToConfirm.length > 0 && (
            <div className="space-y-4 py-4 max-h-96 overflow-y-auto pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {trimestresToConfirm.map((trim, index) => (
                  <div
                    key={index}
                    className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200"
                  >
                    <h3 className="font-bold text-blue-700 dark:text-blue-400 mb-2 text-md">{trim.nom}</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong className="font-medium">{t.common.from}:</strong> {trim.date_debut}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong className="font-medium">{t.common.to}:</strong> {trim.date_fin}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-2 rounded-md border border-orange-200 dark:border-orange-800">
                <span className="font-semibold">{t.common.warning}:</span> {t.schoolManagement.trimesters.confirmDialog.warning}
              </p>
            </div>
          )}
          <DialogFooter className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsConfirmTrimestresOpen(false)} className="px-4 py-2">{t.common.cancel}</Button>
            <Button onClick={handleConfirmSaveTrimestres} className="px-4 py-2">{t.schoolManagement.trimesters.confirmDialog.confirmButton}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Toaster richColors position={isRTL ? "top-left" : "top-right"} />
    </div>
  );
}