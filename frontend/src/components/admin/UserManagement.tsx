import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Check, X, ChevronDown, ChevronUp, Loader2, Shield, User, GraduationCap, BookOpen, Upload, Info, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '../../lib/utils'; // Assuming cn utility is for conditional classes

type UserRole = 'admin' | 'professeur' | 'eleve';

// Types corresponding to your entities
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  genre?: 'masculin' | 'feminin' | null;
  adresse?: string | null;
  tuteurNom?: string | null;
  tuteurTelephone?: string | null;
  photoUrl?: string | null;
  actif: boolean;
  inscriptions?: Inscription[];
}

interface Classe {
  id: number;
  nom: string;
  niveau: 'primaire' | 'collège' | 'lycée';
  annee_scolaire_id: number; // Ajout de la clé pour lier à l'année scolaire

  inscriptions?: Inscription[];
}

interface AnneeScolaire {
  id: number;
  libelle: string;
}

interface Inscription {
  id: number;
  utilisateur: User;
  classe: Classe;
  annee_scolaire: AnneeScolaire;
  date_inscription: string;
  actif: boolean;
}

const roleColors = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  professeur: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  eleve: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

// Simple SortIcon component
type SortKey = keyof User | 'classe' | 'annee_scolaire' | 'utilisateur' | 'actif';
const SortIcon = ({
  column,
  sortConfig,
}: {
  column: SortKey;
  sortConfig: { key: SortKey; direction: 'ascending' | 'descending' } | null;
}) => {
  if (!sortConfig || sortConfig.key !== column)
    return <ChevronDown className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />;
  return sortConfig.direction === 'ascending' ? (
    <ChevronUp className="h-4 w-4 ml-1" />
  ) : (
    <ChevronDown className="h-4 w-4 ml-1" />
  );
};

// Simple password reveal component
const PasswordReveal: React.FC<{ password: string }> = ({ password }) => {
  const [show, setShow] = useState(false);
  return (
    <span id="password-to-copy" className="inline-flex items-center gap-2">
      <Input
        type={show ? "text" : "password"}
        value={password}
        readOnly
        className="w-36 text-base px-2 py-1 border border-gray-300 rounded"
        style={{ fontFamily: "monospace" }}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </span>
  );
};

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<'users' | 'inscriptions'>('users');

  const [inscriptions, setInscriptions] = useState<Inscription[]>([]);
  
  const [generatedPassword, setGeneratedPassword] = useState<{
  password: string;
  nom: string;
  prenom: string;
  email: string;
} | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [academicYears, setAcademicYears] = useState<AnneeScolaire[]>([]);
  const [searchTermUsers, setSearchTermUsers] = useState('');
  const [searchTermInscriptions, setSearchTermInscriptions] = useState('');
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddInscriptionDialogOpen, setIsAddInscriptionDialogOpen] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingInscriptions, setIsLoadingInscriptions] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [stepperData, setStepperData] = useState({
  nom: '',
  prenom: '',
  email: '',
  genre: '',
  adresse: '',
  tuteurNom: '',
  tuteurTelephone: '',
  photoUrl: '',
  role: '',
  actif: true,
  classe_id: '',
  annee_scolaire_id: '',
  date_inscription: new Date().toISOString().split('T')[0],
});

  const [userFormData, setUserFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    genre: '' as 'masculin' | 'feminin' | '',
    adresse: '',
    tuteurNom: '',
    tuteurTelephone: '',
    photoUrl: '',
    role: '' as UserRole | '',
    actif: true,
    classe_id: '', // Added for initial class selection
    annee_scolaire_id: '', // Added for initial academic year selection
    date_inscription: new Date().toISOString().split('T')[0], // Add this line
  });
  const handleEditUserFromInscription = (inscription: Inscription) => {
  setEditUser(inscription.utilisateur);
  setUserFormData({
    nom: inscription.utilisateur.nom,
    prenom: inscription.utilisateur.prenom,
    email: inscription.utilisateur.email,
    genre: inscription.utilisateur.genre || '',
    adresse: inscription.utilisateur.adresse || '',
    tuteurNom: inscription.utilisateur.tuteurNom || '',
    tuteurTelephone: inscription.utilisateur.tuteurTelephone || '',
    photoUrl: inscription.utilisateur.photoUrl || '',
    role: inscription.utilisateur.role,
    actif: inscription.utilisateur.actif,
    classe_id: String(inscription.classe.id),
    annee_scolaire_id: String(inscription.annee_scolaire.id),
    date_inscription: inscription.date_inscription.split('T')[0],
  });
  setIsAddUserDialogOpen(true);
};

  const [inscriptionFormData, setInscriptionFormData] = useState({
    utilisateur_id: '',
    classe_id: '',
    annee_scolaire_id: '',
    date_inscription: new Date().toISOString().split('T')[0],
    actif: true,
  });

  const [sortConfigUsers, setSortConfigUsers] = useState<{ key: keyof User; direction: 'ascending' | 'descending' } | null>(null);
  const [sortConfigInscriptions, setSortConfigInscriptions] = useState<{ key: 'utilisateur' | 'classe' | 'annee_scolaire' | 'actif'; direction: 'ascending' | 'descending' } | null>(null);

  const { toast } = useToast();

  // --- Data Fetching ---
  useEffect(() => {
    async function fetchData() {
      setIsLoadingUsers(true);
      setIsLoadingInscriptions(true);
      try {
        const [usersRes, classesRes, yearsRes] = await Promise.all([
          fetch('http://localhost:3000/api/users'),
          fetch('http://localhost:3000/api/classes'),
          fetch('http://localhost:3000/api/annees-academiques'),
        ]);

        if (!usersRes.ok || !classesRes.ok || !yearsRes.ok) {
          throw new Error('Erreur lors du chargement des données de base');
        }

        const [usersData, classesData, yearsData] = await Promise.all([
          usersRes.json(),
          classesRes.json(),
          yearsRes.json(),
        ]);

        //setUsers(usersData);
        setClasses(classesData);
        setAcademicYears(yearsData);

        // Fetch inscriptions after users, classes, years are loaded for proper linking
        const inscriptionsRes = await fetch('http://localhost:3000/api/inscriptions');
        if (!inscriptionsRes.ok) {
          throw new Error('Erreur lors du chargement des inscriptions');
        }
        const inscriptionsData: Inscription[] = await inscriptionsRes.json();
        // Link inscriptions to actual user, class, academicYear objects
        const linkedInscriptions = inscriptionsData.map(inscription => ({
          ...inscription,
          utilisateur: usersData.find((u: User) => u.id === inscription.utilisateur.id) || inscription.utilisateur,
          classe: classesData.find((c: Classe) => c.id === inscription.classe.id) || inscription.classe,
          annee_scolaire: yearsData.find((a: AnneeScolaire) => a.id === inscription.annee_scolaire.id) || inscription.annee_scolaire,
        }));
        setInscriptions(linkedInscriptions);
        // Ajoute ce bloc juste après setInscriptions(linkedInscriptions);
const usersWithInscriptions = usersData.map((user: User) => ({
  ...user,
  inscriptions: linkedInscriptions.filter((insc: Inscription) => insc.utilisateur.id === user.id),
}));
setUsers(usersWithInscriptions);

      } catch (error) {
        console.error(error);
        toast({
          title: "Erreur",
          description: "Erreur lors du chargement des données initiales.",
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingInscriptions(false);
      }
    }
    fetchData();
  }, [toast]); // Depend on toast to ensure it's available

  // --- Form Handlers ---
  const handleUserFormChange = useCallback((field: keyof typeof userFormData) => (value: any) => {
    setUserFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleInscriptionFormChange = useCallback((field: keyof typeof inscriptionFormData) => (value: any) => {
    setInscriptionFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // --- User Submission Logic ---
  const handleAddUserSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const userData: Partial<User> = {
      nom: userFormData.nom,
      prenom: userFormData.prenom,
      email: userFormData.email,
      genre: userFormData.genre === 'masculin' || userFormData.genre === 'feminin' ? userFormData.genre : null,
      adresse: userFormData.adresse,
      photoUrl: userFormData.photoUrl || null,
      role: userFormData.role === "" ? 'eleve' : userFormData.role, // Default to 'eleve' if not selected
      actif: userFormData.actif,
    };

    if (userFormData.role === 'eleve') {
      if (userFormData.tuteurNom && userFormData.tuteurNom.trim() !== '') {
        userData.tuteurNom = userFormData.tuteurNom;
      }
      if (userFormData.tuteurTelephone && userFormData.tuteurTelephone.trim() !== '') {
        userData.tuteurTelephone = userFormData.tuteurTelephone;
      }
    }

    // --- AJOUTE CETTE PARTIE POUR LA MISE À JOUR ---
    if (editUser) {
      // Mode édition (mise à jour)
      const response = await fetch(`http://localhost:3000/api/users/${editUser.id}`, {
        method: 'PUT', // ou 'PATCH' selon ton API
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erreur lors de la mise à jour.");
      }

      const updatedUser: User = await response.json();
      setUsers((prev) =>
        prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
      );

      toast({
        title: "Utilisateur mis à jour",
        description: `${updatedUser.prenom} ${updatedUser.nom} a été modifié(e) avec succès.`,
        variant: "default",
      });

      setEditUser(null);
      setIsAddUserDialogOpen(false);
      setIsSubmitting(false);
      return;
    }
    // --- FIN DE LA PARTIE MISE À JOUR ---

    // --- CRÉATION (ton code existant) ---
    const userResponse = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    if (!userResponse.ok) {
      const errorData = await userResponse.json();
      throw new Error(errorData.message || 'Échec de la création de l\'utilisateur.');
    }

    // Ici, on suppose que la réponse contient { user: ..., password: ... }
    const responseData = await userResponse.json();
    const newUser: User = responseData.user || responseData;
    setUsers((prev) => [...prev, newUser]);

    // Si le mot de passe est présent, on le stocke et on l'affiche temporairement
    if (responseData.motDePasse) {
  setGeneratedPassword({
    password: responseData.motDePasse,
    nom: newUser.nom,
    prenom: newUser.prenom,
    email: newUser.email,
  });
}

    // If the new user is an 'eleve', open the inscription dialog
    if (newUser.role === 'eleve') {
  setActiveTab('inscriptions'); // Passe à l’onglet inscriptions
  setInscriptionFormData(prev => ({
    ...prev,
    utilisateur_id: String(newUser.id),
    tuteurNom: newUser.tuteurNom || '',
    tuteurTelephone: newUser.tuteurTelephone || '',
    classe_id: userFormData.classe_id,
    annee_scolaire_id: userFormData.annee_scolaire_id,
  }));
  setTimeout(() => setIsAddInscriptionDialogOpen(true), 200); // Ouvre le modal après le changement d’onglet
}

    toast({
      title: "Succès !",
      description: `L'utilisateur ${newUser.prenom} ${newUser.nom} a été ajouté(e) avec succès.`,
      variant: "default",
    });

    setUserFormData({ // Reset user form
      nom: '',
      prenom: '',
      email: '',
      genre: '',
      adresse: '',
      tuteurNom: '',
      tuteurTelephone: '',
      photoUrl: '',
      role: '',
      actif: true,
      classe_id: '',
      annee_scolaire_id: '',
      date_inscription: new Date().toISOString().split('T')[0],
    });
    setIsAddUserDialogOpen(false); // Close user dialog

  } catch (error) {
    console.error("Erreur lors de la création/mise à jour de l'utilisateur:", error);
    toast({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'ajout/mise à jour de l'utilisateur.",
      variant: "destructive",
    });
  } finally {
    setIsSubmitting(false);
  }
};

  // --- Inscription Submission Logic ---
  const handleAddInscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!inscriptionFormData.utilisateur_id || !inscriptionFormData.classe_id || !inscriptionFormData.annee_scolaire_id) {
        throw new Error("Veuillez sélectionner un élève, une classe et une année scolaire.");
      }

      const response = await fetch('http://localhost:3000/api/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utilisateur_id: parseInt(inscriptionFormData.utilisateur_id),
          classe_id: parseInt(inscriptionFormData.classe_id),
          annee_scolaire_id: parseInt(inscriptionFormData.annee_scolaire_id),
          date_inscription: inscriptionFormData.date_inscription,
          actif: inscriptionFormData.actif,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur lors de la création de l\'inscription.');
      }

      const newInscription: Inscription = await response.json();
      // Manually link the related objects for immediate display
      const linkedInscription = {
        ...newInscription,
        utilisateur: users.find(u => u.id === newInscription.utilisateur.id) || newInscription.utilisateur,
        classe: classes.find(c => c.id === newInscription.classe.id) || newInscription.classe,
        annee_scolaire: academicYears.find(a => a.id === newInscription.annee_scolaire.id) || newInscription.annee_scolaire,
      };

      setInscriptions(prev => [...prev, linkedInscription]);

      toast({
        title: "Succès !",
        description: "L'inscription a été ajoutée avec succès.",
        variant: "default",
      });

      setInscriptionFormData({ // Reset inscription form
        utilisateur_id: '', classe_id: '', annee_scolaire_id: '', date_inscription: new Date().toISOString().split('T')[0], actif: true,
      });
      setIsAddInscriptionDialogOpen(false); // Close inscription dialog

    } catch (error) {
      console.error("Erreur lors de la création de l'inscription:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Une erreur est survenue lors de l'ajout de l'inscription.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // --- Sorting Logic for Users ---
  const requestSortUsers = (key: keyof User) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigUsers && sortConfigUsers.key === key && sortConfigUsers.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigUsers({ key, direction });
  };

  const sortedUsers = useMemo(() => {
    let sortableUsers = [...users];
    if (sortConfigUsers && sortConfigUsers.key) {
      sortableUsers.sort((a, b) => {
        const aValue = String(a[sortConfigUsers.key] || '').toLowerCase();
        const bValue = String(b[sortConfigUsers.key] || '').toLowerCase();

        if (aValue < bValue) {
          return sortConfigUsers.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfigUsers.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableUsers;
  }, [users, sortConfigUsers]);

  const filteredUsers = useMemo(() => {
    return sortedUsers.filter(user =>
      user.nom.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      user.prenom.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      user.role.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
      (user.tuteurNom && user.tuteurNom.toLowerCase().includes(searchTermUsers.toLowerCase()))
    );
  }, [sortedUsers, searchTermUsers]);

  // --- Sorting Logic for Inscriptions ---
  const requestSortInscriptions = (key: 'utilisateur' | 'classe' | 'annee_scolaire' | 'actif') => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfigInscriptions && sortConfigInscriptions.key === key && sortConfigInscriptions.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfigInscriptions({ key, direction });
  };

  const sortedInscriptions = useMemo(() => {
    let sortableInscriptions = [...inscriptions];
    if (sortConfigInscriptions && sortConfigInscriptions.key) {
      sortableInscriptions.sort((a, b) => {
        let aValue: string | boolean;
        let bValue: string | boolean;

        if (sortConfigInscriptions.key === 'utilisateur') {
          aValue = (a.utilisateur.nom + a.utilisateur.prenom).toLowerCase();
          bValue = (b.utilisateur.nom + b.utilisateur.prenom).toLowerCase();
        } else if (sortConfigInscriptions.key === 'classe') {
          aValue = (a.classe.nom).toLowerCase();
          bValue = (b.classe.nom).toLowerCase();
        } else if (sortConfigInscriptions.key === 'annee_scolaire') {
          aValue = (a.annee_scolaire.libelle).toLowerCase();
          bValue = (b.annee_scolaire.libelle).toLowerCase();
        } else if (sortConfigInscriptions.key === 'actif') {
          aValue = a.actif;
          bValue = b.actif;
        } else {
            // Fallback for direct properties, though types suggest it's nested
            aValue = String((a as any)[sortConfigInscriptions.key] || '').toLowerCase();
            bValue = String((b as any)[sortConfigInscriptions.key] || '').toLowerCase();
        }


        if (aValue < bValue) {
          return sortConfigInscriptions.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfigInscriptions.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableInscriptions;
  }, [inscriptions, sortConfigInscriptions]);
// ...existing code...
// Hook useMemo pour filtrer les classes en fonction de l'année scolaire sélectionnée dans le formulaire utilisateur
  const availableClassesForSelectedYear = useMemo(() => {
    if (!userFormData.annee_scolaire_id) {
      // Si aucune année scolaire n'est sélectionnée, retourner toutes les classes
      // ou un tableau vide si vous voulez forcer la sélection de l'année d'abord.
      // Pour l'instant, retournons toutes les classes pour ne pas bloquer l'UI.
      return classes;
    }
    const selectedYearId = parseInt(userFormData.annee_scolaire_id, 10);
    return classes.filter(classe => classe.annee_scolaire_id === selectedYearId);
  }, [classes, userFormData.annee_scolaire_id]);

  // useEffect pour réinitialiser la classe si l'année scolaire change et que la classe n'est plus valide
  useEffect(() => {
    if (userFormData.annee_scolaire_id && userFormData.classe_id) {
      const selectedYearId = parseInt(userFormData.annee_scolaire_id, 10);
      const currentSelectedClass = availableClassesForSelectedYear.find(c => c.id === parseInt(userFormData.classe_id, 10));
      if (!currentSelectedClass || currentSelectedClass.annee_scolaire_id !== selectedYearId) {
        setUserFormData(prev => ({ ...prev, classe_id: '' }));
      }
    }
  }, [userFormData.annee_scolaire_id, userFormData.classe_id, availableClassesForSelectedYear]);

const [filterClasseId, setFilterClasseId] = useState<string>('');
const [filterAnneeId, setFilterAnneeId] = useState<string>('');
// ...existing code...
useEffect(() => {
  if (editUser) {
    // Cherche l'inscription active (ou la plus récente si aucune active)
    let classe_id = '';
    let annee_scolaire_id = '';
    let date_inscription = new Date().toISOString().split('T')[0];

    if (editUser.inscriptions && editUser.inscriptions.length > 0) {
      // Prend l'inscription active, sinon la plus récente
      const inscription =
        editUser.inscriptions.find(i => i.actif) ||
        editUser.inscriptions[editUser.inscriptions.length - 1];

      if (inscription) {
        classe_id = String(inscription.classe.id);
        annee_scolaire_id = String(inscription.annee_scolaire.id);
        date_inscription = inscription.date_inscription.split('T')[0];
      }
    }

    setUserFormData({
      nom: editUser.nom,
      prenom: editUser.prenom,
      email: editUser.email,
      genre: editUser.genre || '',
      adresse: editUser.adresse || '',
      tuteurNom: editUser.tuteurNom || '',
      tuteurTelephone: editUser.tuteurTelephone || '',
      photoUrl: editUser.photoUrl || '',
      role: editUser.role,
      actif: editUser.actif,
      classe_id,
      annee_scolaire_id,
      date_inscription,
    });
    setIsAddUserDialogOpen(true);
  }
}, [editUser]);
// ...existing code...

  const filteredInscriptions = useMemo(() => {
  return sortedInscriptions.filter(inscription =>
    (filterClasseId === 'all' || String(inscription.classe.id) === filterClasseId) &&
    (filterAnneeId === 'all' || String(inscription.annee_scolaire.id) === filterAnneeId) &&
    (
      inscription.utilisateur.nom.toLowerCase().includes(searchTermInscriptions.toLowerCase()) ||
      inscription.utilisateur.prenom.toLowerCase().includes(searchTermInscriptions.toLowerCase()) ||
      inscription.utilisateur.email.toLowerCase().includes(searchTermInscriptions.toLowerCase()) ||
      inscription.classe.nom.toLowerCase().includes(searchTermInscriptions.toLowerCase()) ||
      inscription.classe.niveau.toLowerCase().includes(searchTermInscriptions.toLowerCase()) ||
      inscription.annee_scolaire.libelle.toLowerCase().includes(searchTermInscriptions.toLowerCase())
    )
  );
}, [sortedInscriptions, searchTermInscriptions, filterClasseId, filterAnneeId]);

  const availableStudents = useMemo(() => users.filter(user => user.role === 'eleve'), [users]);
  // Memoized list of classes for the inscription filter, dependent on the selected academic year filter
  const availableClassesForInscriptionFilter = useMemo(() => {
    if (!filterAnneeId || filterAnneeId === 'all') {
      return classes; // Show all classes if no year is selected or "all years"
    }
    const selectedYearIdNum = parseInt(filterAnneeId, 10);
    return classes.filter(classe => classe.annee_scolaire_id === selectedYearIdNum);
  }, [classes, filterAnneeId]);

  // Effect to reset class filter if the selected year changes and the current class is no longer valid
  useEffect(() => {
    if (filterAnneeId && filterAnneeId !== 'all' && filterClasseId && filterClasseId !== 'all') {
      if (!availableClassesForInscriptionFilter.some(c => String(c.id) === filterClasseId)) {
        setFilterClasseId('all'); // Reset to "all classes"
      }
    }
  }, [filterAnneeId, filterClasseId, availableClassesForInscriptionFilter]);

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mb-6 flex justify-center space-x-4">
        <Button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-8 py-3 text-lg rounded-xl transition-all duration-300 ease-in-out",
            activeTab === 'users'
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg-soft"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          )}
        >
          Gestion des Utilisateurs
        </Button>
        <Button
          onClick={() => setActiveTab('inscriptions')}
          className={cn(
            "px-8 py-3 text-lg rounded-xl transition-all duration-300 ease-in-out",
            activeTab === 'inscriptions'
              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg-soft"
              : "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          )}
        >
          Gestion des Inscriptions
        </Button>
      </div>

      {/* --- User Management View --- */}
      {activeTab === 'users' && (
        <>
          <div className="flex justify-end mb-6">
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Ajouter un utilisateur
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 bg-white dark:bg-gray-950 rounded-3xl shadow-soft-xl border border-gray-50 dark:border-gray-850">
            {/* Header with very soft, inviting gradient and subtle abstract shapes */}
            <div className="relative bg-gradient-to-br from-blue-300 to-indigo-400 dark:from-blue-700 dark:to-indigo-800 px-8 py-7 rounded-t-3xl overflow-hidden">
              {/* Abstract shapes for a dreamy, educational feel */}
              <div className="absolute inset-0 z-0 opacity-20 dark:opacity-10">
                <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                  <path fill="#ffffff" fillOpacity="0.1" d="M0,192L48,176C96,160,192,128,288,106.7C384,85,480,75,576,85.3C672,96,768,128,864,138.7C960,149,1056,139,1152,122.7C1248,107,1344,85,1392,74.7L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                  <path fill="#ffffff" fillOpacity="0.05" d="M0,96L48,101.3C96,107,192,117,288,138.7C384,160,480,192,576,170.7C672,149,768,75,864,69.3C960,64,1056,128,1152,149.3C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                </svg>
              </div>
             <DialogHeader className="relative z-10">
            <DialogTitle className="flex items-center gap-4 text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
              <User className="h-8 w-8 text-white animate-fade-in-up" /> {/* Animation on icon */}
              <span>Inscription de nouvel(le) utilisateur(rice)</span>
            </DialogTitle>
            <DialogDescription className="text-blue-100 dark:text-blue-200 mt-2 text-base max-w-md drop-shadow-sm">
              Remplissez ce formulaire pour ajouter un nouvel(le) élève, professeur(e) ou administrateur(rice) à votre établissement.
            </DialogDescription>
          </DialogHeader>
            </div>
          
            <form onSubmit={handleAddUserSubmit} className="p-8 space-y-8">
              {/* Section 1: Identité */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  INFORMATIONS PERSONNELLES
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nom */}
                  <div className="space-y-2">
                    <Label htmlFor="nom" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Nom <span className="text-red-500">*</span></Label>
                    <Input
                      id="nom"
                      type="text"
                      required
                      placeholder="Ex: Dubois"
                      value={userFormData.nom}
                      onChange={e => setUserFormData(prev => ({ ...prev, nom: e.target.value }))}
                      className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                    />
                  </div>
            
                  {/* Prénom */}
                  <div className="space-y-2">
                    <Label htmlFor="prenom" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Prénom <span className="text-red-500">*</span></Label>
                    <Input
                      id="prenom"
                      type="text"
                      required
                      placeholder="Ex: Sophie"
                      value={userFormData.prenom}
                      onChange={e => setUserFormData(prev => ({ ...prev, prenom: e.target.value }))}
                      className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                    />
                  </div>
            
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Email <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="Ex: sophie.dubois@ecole.fr"
                      value={userFormData.email}
                      onChange={e => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                    />
                  </div>
            
                  {/* Genre */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">Genre</Label>
                    <Select
                      value={userFormData.genre}
                      onValueChange={(value) => setUserFormData(prev => ({ ...prev, genre: value as 'masculin' | 'feminin' | '' }))}
                    >
                      <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                        <SelectValue placeholder="Sélectionner le genre" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                        <SelectItem value="masculin">Masculin</SelectItem>
                        <SelectItem value="feminin">Féminin</SelectItem>
                        <SelectItem value="non-binaire">Non-binaire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            
              {/* Section 2: Photo de profil */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  PHOTO DE PROFIL
                </h3>
            
                <div className="flex flex-col items-center gap-5 pt-2">
                  <div className="relative group">
                    <Avatar className="h-32 w-32 border-4 border-white dark:border-gray-800 shadow-lg-soft group-hover:border-blue-300 transition-all duration-300 ease-in-out transform group-hover:scale-105">
                      <AvatarImage src={userFormData.photoUrl} alt="Photo de profil" className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-blue-500 dark:text-blue-400">
                        <User className="h-14 w-14" />
                      </AvatarFallback>
                    </Avatar>
                    {userFormData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => setUserFormData(prev => ({ ...prev, photoUrl: "" }))}
                        className="absolute -top-4 -right-4 bg-red-400 text-white rounded-full p-2 hover:bg-red-500 transition-all duration-200 shadow-md transform hover:scale-110 flex items-center justify-center"
                        aria-label="Supprimer la photo"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
            
                  <label htmlFor="photo-upload" className="flex flex-col items-center gap-3 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const mockUrl = URL.createObjectURL(file);
                            setUserFormData(prev => ({...prev, photoUrl: mockUrl}));
                          } catch (error) {
                            console.error('Upload error:', error);
                          }
                        }
                      }}
                      className="hidden"
                      id="photo-upload"
                    />
                    <Button
                      variant="outline"
                      className="gap-2 px-6 py-3 rounded-xl border-blue-200 dark:border-gray-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200 shadow-sm-light hover:shadow-md-light group"
                      asChild
                    >
                      <div>
                        <Upload className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span className="font-medium">{userFormData.photoUrl ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}</span>
                      </div>
                    </Button>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-light mt-1">Formats acceptés: JPG, PNG, GIF (Max 2MB)</span>
                  </label>
                </div>
              </div>
            
              {/* Section 3: Rôle et Scolarité */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  RÔLE ET SCOLARITÉ
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Rôle */}
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">Rôle <span className="text-red-500">*</span></Label>
                    <Select
                      value={userFormData.role}
                      onValueChange={(value) => setUserFormData({ ...userFormData, role: value as UserRole })}
                    >
                      <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                        <SelectItem value="admin" className="group flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-150">
                          <Shield className="h-4 w-4 text-purple-500 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                          <span>Administrateur</span>
                        </SelectItem>
                        <SelectItem value="professeur" className="group flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300">
                          <GraduationCap className="h-4 w-4 text-blue-500 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                          <span>Professeur</span>
                        </SelectItem>
                        <SelectItem value="eleve" className="group flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-700 dark:hover:text-green-300">
                          <BookOpen className="h-4 w-4 text-green-500 group-hover:text-green-700 dark:group-hover:text-green-300" />
                          <span>Élève</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
            
            {/* Année Scolaire */}
            <div className="space-y-2">
              <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">Année Scolaire</Label>
             <Select
             value={userFormData.annee_scolaire_id} // userFormData.annee_scolaire_id is a string
             onValueChange={(value) => {
               setUserFormData({
                 ...userFormData,
                 annee_scolaire_id: value, // 'value' from onValueChange is already a string
               });
             }}
           >
             <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
               <SelectValue placeholder="Sélectionner une année" />
             </SelectTrigger>
             <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
               {academicYears.length === 0 ? (
                 <SelectItem value="no-years-available" disabled>
                   Aucune année scolaire disponible
                 </SelectItem>
               ) : (
                 academicYears.map((anneescolaire) => (
                   <SelectItem key={anneescolaire.id} value={String(anneescolaire.id)}>
                     {anneescolaire.libelle}
                   </SelectItem>
                 ))
               )}
             </SelectContent>
           </Select>
            </div>

                  {/* Classe */}
            {/* Classe */}
<div className="space-y-2">
  <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">Classe</Label>
  {(() => {
    const classesToDisplay = availableClassesForSelectedYear;
    // Determine if the class select should be disabled
    const isClasseDisabled = userFormData.role !== 'eleve' || !userFormData.annee_scolaire_id;
    return (
      <Select
        value={userFormData.classe_id}
        onValueChange={(value) => {
          setUserFormData({
            ...userFormData,
            classe_id: value,
          });
        }}
        // Add the disabled prop here
        disabled={isClasseDisabled}
      >
        <SelectTrigger className={`h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm ${isClasseDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <SelectValue placeholder="Sélectionner une classe" />
        </SelectTrigger>
        <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
          {classesToDisplay.length === 0 ? (
            <SelectItem value="no-classes-available" disabled>
              {userFormData.annee_scolaire_id ? "Aucune classe pour cette année" : "Sélectionnez une année d'abord"}
            </SelectItem>
          ) : (
            classesToDisplay.map((classe) => (
              <SelectItem key={classe.id} value={String(classe.id)}>
                {classe.nom}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  })()}
</div>
            
                  

            {/* Date inscription */}
            <div className="space-y-2">
                <Label htmlFor="date_inscription" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Date d'inscription <span className="text-red-500">*</span></Label>
                <Input
                    id="date_inscription"
                    type="date"
                    required
                    value={userFormData.date_inscription}
                    onChange={e => setUserFormData(prev => ({ ...prev, date_inscription: e.target.value }))}
                    className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                />
            </div>
                  
                </div>
              </div>
            
              {/* Section 4: Informations supplémentaires */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  COORDONNÉES ET STATUT
                </h3>
            
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Adresse */}
                  <div className="space-y-2">
                    <Label htmlFor="adresse" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Adresse</Label>
                    <Input
                      id="adresse"
                      type="text"
                      placeholder="Ex: 123 Avenue des Savoirs"
                      value={userFormData.adresse}
                      onChange={e => handleUserFormChange('adresse')(e.target.value)}
                      className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                    />
                  </div>
            
                  {/* Tuteur */}
<div className="space-y-2">
  <Label htmlFor="tuteur" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Nom du tuteur (si applicable)</Label>
  <Input
    id="tuteur"
    type="text"
    placeholder="Ex: Mme. Claire Martin"
    value={userFormData.tuteurNom}
    onChange={e => handleUserFormChange('tuteurNom')(e.target.value)}
    // Add the disabled prop here
    disabled={userFormData.role !== 'eleve'}
    className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  />
</div>

{/* Téléphone Tuteur */}
<div className="space-y-2">
  <Label htmlFor="tuteur_telephone" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Téléphone du tuteur</Label>
  <Input
    id="tuteur_telephone"
    type="text"
    placeholder="Ex: +33 7 98 76 54 32"
    value={userFormData.tuteurTelephone}
    onChange={e => handleUserFormChange('tuteurTelephone')(e.target.value)}
    // Add the disabled prop here
    disabled={userFormData.role !== 'eleve'}
    className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  />
</div>
                  {/* Statut Actif */}
                  <div className="flex items-center justify-between pt-4">
                    <Label htmlFor="actif" className="text-gray-700 dark:text-gray-200 text-sm font-medium cursor-pointer">Compte actif</Label>
                    <Switch
                      id="actif"
                      checked={userFormData.actif}
                      onCheckedChange={(checked) => setUserFormData({...userFormData, actif: checked})}
                      className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600 transition-colors duration-200 ease-in-out"
                    />
                  </div>
                </div>
              </div>
            
              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserDialogOpen(false)}
                  className="px-7 py-3 rounded-xl border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                >
                  Annuler
                </Button>
                {!editUser && (
  <Button
    type="submit"
    className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg-soft transition-all duration-300 ease-in-out hover:shadow-xl-soft transform hover:-translate-y-1"
  >
    <Plus className="h-4 w-4 mr-2" />
    Créer l'utilisateur(rice)
  </Button>
)}
{editUser && (
  <Button type="submit">
    Mettre à jour l'utilisateur
  </Button>
  
)}
              </div>
            </form>
          </DialogContent>
          
        </Dialog>
          </div>
          

          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg text-gray-900 dark:text-white">Liste des utilisateurs</CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
                  <Input
                    placeholder="Rechercher un utilisateur..."
                    value={searchTermUsers}
                    onChange={(e) => setSearchTermUsers(e.target.value)}
                    className="pl-10 w-full focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoadingUsers ? (
                  <div className="space-y-4 p-6">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortUsers('nom')}
                        >
                          <div className="flex items-center">
                            Nom & Prénom
                            <SortIcon column="nom" sortConfig={sortConfigUsers} />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortUsers('email')}
                        >
                          <div className="flex items-center">
                            Email
                            <SortIcon column="email" sortConfig={sortConfigUsers} />
                          </div>
                        </th>
                        
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          <div className="flex items-center">
                            Classe
                            {/* Class isn't a direct sortable field on User, but can be derived from inscriptions */}
                            {/* <SortIcon column="classe_id" sortConfig={sortConfigUsers} /> */}
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortUsers('actif')}
                        >
                          <div className="flex items-center">
                            Statut
                            <SortIcon column="actif" sortConfig={sortConfigUsers} />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {searchTermUsers ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Avatar className="h-10 w-10 mr-3 border border-gray-200 dark:border-gray-600">
                                        <AvatarImage src={user.photoUrl || undefined} />
                                        <AvatarFallback>
                                          {user.nom?.[0]}{user.prenom?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <img
                                        src={user.photoUrl || '/default-user.png'}
                                        alt={`${user.nom} ${user.prenom}`}
                                        className="h-24 w-24 rounded-md object-cover"
                                      />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <div>
                                  <div
  className="font-medium text-blue-700 dark:text-blue-300 cursor-pointer underline hover:text-blue-900"
  onClick={() => setEditUser(user)}
  title="Modifier cet utilisateur"
>
  {user.nom} {user.prenom}
</div>
                                  {user.tuteurNom && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Tuteur: {user.tuteurNom}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${roleColors[user.role]} capitalize`}>
                                {user.role}
                              </Badge>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.actif ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" />
                                  Actif
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" />
                                  Inactif
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* --- Inscription Management View --- */}
      {activeTab === 'inscriptions' && (
        <>
          <div className="flex justify-end mb-6">
            <Dialog open={isAddInscriptionDialogOpen} onOpenChange={setIsAddInscriptionDialogOpen}>
              
              <DialogContent className="sm:max-w-[800px] p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">Ajouter une nouvelle inscription</DialogTitle>
                  
                  <DialogDescription className="text-gray-500 dark:text-gray-400">
                    Remplissez les informations ci-dessous pour créer une nouvelle inscription.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInscriptionSubmit} className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Informations de base de l'inscription */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Informations de l'inscription</h3>
                      <div className="space-y-2">
                        <Label htmlFor="utilisateur_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Utilisateur (Élève)</Label>
                        <Select
                          value={inscriptionFormData.utilisateur_id}
                          onValueChange={handleInscriptionFormChange('utilisateur_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder="Sélectionner un élève" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg">
                            {availableStudents.map((user) => (
                              <SelectItem key={user.id} value={String(user.id)}>
                                {user.prenom} {user.nom} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="classe_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Classe</Label>
                        <Select
                          value={inscriptionFormData.classe_id}
                          onValueChange={handleInscriptionFormChange('classe_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder="Sélectionner une classe" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg">
                            {classes.map((classe) => (
                              <SelectItem key={classe.id} value={String(classe.id)}>
                                {classe.nom} ({classe.niveau})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="annee_scolaire_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">Année Scolaire</Label>
                        <Select
                          value={inscriptionFormData.annee_scolaire_id}
                          onValueChange={handleInscriptionFormChange('annee_scolaire_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder="Sélectionner une année scolaire" />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg shadow-lg">
                            {academicYears.map((year) => (
                              <SelectItem key={year.id} value={String(year.id)}>
                                {year.libelle}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Statut Inscription */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Statut de l'inscription</h3>
                      <div className="flex items-center justify-between pt-4">
                        <Label htmlFor="inscription_actif" className="text-gray-700 dark:text-gray-200 text-sm font-medium cursor-pointer">Inscription active</Label>
                        <Switch
                          id="inscription_actif"
                          checked={inscriptionFormData.actif}
                          onCheckedChange={(checked) => handleInscriptionFormChange('actif')(checked)}
                          className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600 transition-colors duration-200 ease-in-out"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddInscriptionDialogOpen(false)}
                      className="px-7 py-3 rounded-xl border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg-soft transition-all duration-300 ease-in-out hover:shadow-xl-soft transform hover:-translate-y-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Créer l'inscription
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-lg text-gray-900 dark:text-white">Liste des inscriptions</CardTitle>
               
<div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
  <div className="relative w-full sm:w-64">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
    <Input
      placeholder="Rechercher une inscription..."
      value={searchTermInscriptions}
      onChange={(e) => setSearchTermInscriptions(e.target.value)}
      className="pl-10 w-full focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
    />
  </div>
  <Select
  value={filterAnneeId}
  onValueChange={setFilterAnneeId}
>
  <SelectTrigger className="w-44">
    <SelectValue placeholder="Filtrer par année" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Toutes les années</SelectItem>
    {academicYears.map((annee) => (
      <SelectItem key={annee.id} value={String(annee.id)}>
        {annee.libelle}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
  <Select
  value={filterClasseId}
  onValueChange={setFilterClasseId}
>
  <SelectTrigger className="w-44">
    <SelectValue placeholder="Filtrer par classe" />
  </SelectTrigger>
  <SelectContent>
     <SelectItem value="all">Toutes les classes</SelectItem> {/* Ensure "all" is a string */}
    {availableClassesForInscriptionFilter.map((classe) => (
      <SelectItem key={classe.id} value={String(classe.id)}>
        {classe.nom}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

</div>
                
                
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {isLoadingInscriptions ? (
                  <div className="space-y-4 p-6">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                    ))}
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortInscriptions('utilisateur')}
                        >
                          <div className="flex items-center">
                            Élève (Nom & Prénom)
                            <SortIcon column="utilisateur" sortConfig={sortConfigInscriptions} />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortInscriptions('classe')}
                        >
                          <div className="flex items-center">
                            Classe
                            <SortIcon column="classe" sortConfig={sortConfigInscriptions} />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortInscriptions('annee_scolaire')}
                        >
                          <div className="flex items-center">
                            Année Scolaire
                            <SortIcon column="annee_scolaire" sortConfig={sortConfigInscriptions} />
                          </div>
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                        >
                          Rôle
                        </th>
                        <th
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                          onClick={() => requestSortInscriptions('actif')}
                        >
                          <div className="flex items-center">
                            Statut
                            <SortIcon column="actif" sortConfig={sortConfigInscriptions} />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {filteredInscriptions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                            {searchTermInscriptions ? 'Aucune inscription trouvée' : 'Aucune inscription disponible'}
                          </td>
                        </tr>
                      ) : (
                        filteredInscriptions.map((inscription) => (
                          <tr
  key={inscription.id}
  className="hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors cursor-pointer"
  onClick={() => handleEditUserFromInscription(inscription)}
>
                            {/* Élève (Nom & Prénom, Email, and Tuteur if any) */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Avatar className="h-10 w-10 mr-3 border border-gray-200 dark:border-gray-600">
                                        <AvatarImage src={inscription.utilisateur.photoUrl || undefined} />
                                        <AvatarFallback>
                                          {inscription.utilisateur.prenom?.[0]}{inscription.utilisateur.nom?.[0]}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <img
                                        src={inscription.utilisateur.photoUrl || '/default-user.png'}
                                        alt={`${inscription.utilisateur.prenom} ${inscription.utilisateur.nom}`}
                                        className="h-24 w-24 rounded-md object-cover"
                                      />
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {inscription.utilisateur.prenom} {inscription.utilisateur.nom}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {inscription.utilisateur.email}
                                  </div>
                                  {inscription.utilisateur.tuteurNom && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      Tuteur: {inscription.utilisateur.tuteurNom}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Classe & Niveau */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {inscription.classe.nom}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {inscription.classe.niveau}
                              </div>
                            </td>

                            {/* Année Scolaire */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {inscription.annee_scolaire.libelle}
                            </td>

                            {/* Rôle */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${roleColors[inscription.utilisateur.role]} capitalize`}>
                                {inscription.utilisateur.role}
                              </Badge>
                            </td>

                            {/* Statut Inscription */}
                            <td className="px-6 py-4 whitespace-nowrap">
                              {inscription.actif ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" />
                                  Inactive
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </CardContent>
          </Card>
        </>
        )}
        {generatedPassword && (
  <Dialog open={!!generatedPassword} onOpenChange={() => setGeneratedPassword(null)}>
    <DialogContent className="max-w-md w-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 p-0 overflow-hidden">
      <div className="flex flex-col items-center text-center px-6 py-8">
        <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 mb-3 animate-bounce shadow-lg">
          <Check className="h-8 w-8 text-green-600 dark:text-green-300" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-blue-900 dark:text-blue-100">Utilisateur créé avec succès !</h2>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-semibold">
            <Info className="h-4 w-4 mr-1" /> Important
          </span>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
          Ces informations sont <span className="font-semibold text-blue-700 dark:text-blue-200">à transmettre à l'utilisateur</span>.<br />
          <span className="text-red-500 font-medium">Le mot de passe ne sera plus affiché après fermeture.</span>
        </p>
        <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-4 space-y-2 border border-gray-100 dark:border-gray-700 text-left">
          <div>
            <span className="font-semibold">Nom :</span> {generatedPassword.nom}
          </div>
          <div>
            <span className="font-semibold">Prénom :</span> {generatedPassword.prenom}
          </div>
          <div>
            <span className="font-semibold">Email :</span> {generatedPassword.email}
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold">Mot de passe :</span>
            <PasswordReveal password={generatedPassword.password} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => {
                navigator.clipboard.writeText(generatedPassword.password);
                const el = document.getElementById('password-to-copy');
                if (el) {
                  el.classList.add('ring', 'ring-blue-400');
                  setTimeout(() => el.classList.remove('ring', 'ring-blue-400'), 700);
                }
                toast({
                  title: "Mot de passe copié !",
                  variant: "default",
                });
              }}
            >
              Copier
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mb-2"
          onClick={() => {
            navigator.clipboard.writeText(
              `Nom: ${generatedPassword.nom}\nPrénom: ${generatedPassword.prenom}\nEmail: ${generatedPassword.email}\nMot de passe: ${generatedPassword.password}`
            );
            toast({
              title: "Informations copiées !",
              description: "Toutes les informations de connexion ont été copiées.",
              variant: "default",
            });
          }}
        >
          Copier toutes les infos
        </Button>
        <Button
          onClick={() => setGeneratedPassword(null)}
          className="mt-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
        >
          Fermer
        </Button>
      </div>
    </DialogContent>
  </Dialog>
)}
    </div>
  );
}
