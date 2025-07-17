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
import { Plus, Search, Check, X, ChevronDown, ChevronUp, Loader2, Shield, User, GraduationCap, BookOpen, Upload, Info, Eye, EyeOff, Users as UsersIcon } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '../../lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

type UserRole = 'admin' | 'professeur' | 'eleve';

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
  annee_scolaire_id: number;
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
interface PasswordRevealProps {
  password: string;
  showPasswordText: string;
  hidePasswordText: string;
}

const roleColors = {
  admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  professeur: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  eleve: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

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

const PasswordReveal: React.FC<PasswordRevealProps> = ({ 
  password, 
  showPasswordText, 
  hidePasswordText 
}) => {  const [show, setShow] = useState(false);
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
        aria-label={show ? hidePasswordText : showPasswordText}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </span>
  );
};

export default function UserManagement() {
  const { t, language } = useLanguage(); // Destructurez language

  const [activeTab, setActiveTab] = useState<'users' | 'inscriptions'>('users');
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');
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
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);
const handlePrintClassStudents = async (classeId: number) => {
  try {
    // Récupération des informations de l'établissement
    const establishmentResponse = await fetch(`${API_URL}/api/establishment-info`);
    let schoolName = "Nom de l'École";
    let schoolLogo = "";

    if (establishmentResponse.ok) {
      const establishmentData = await establishmentResponse.json();
      schoolName = establishmentData.schoolName || schoolName;
      schoolLogo = establishmentData.logoUrl || schoolLogo;
    }

    const selectedClass = classes.find(c => c.id === classeId);
    const studentsInClass = inscriptions
      .filter(insc => insc.classe.id === classeId && insc.utilisateur.role === 'eleve')
      .sort((a, b) => a.utilisateur.nom.localeCompare(b.utilisateur.nom))
      .map(insc => `${insc.utilisateur.nom} ${insc.utilisateur.prenom}`);

    if (studentsInClass.length === 0) {
      toast({
        title: t.common.warning,
        description: t.userManagement.noStudentsInClass,
        variant: "default",
      });
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      const currentDate = new Date();
      const formattedDate = currentDate.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      printWindow.document.write(`
        <html>
          <head>
            <title>Liste des Élèves - ${selectedClass?.nom}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
              
              body { 
                font-family: 'Montserrat', sans-serif; 
                margin: 0;
                padding: 0;
                color: #333;
                background-color: #f9f9f9;
              }
              
              .page-container {
                max-width: 800px;
                margin: 40px auto;
                padding: 30px;
                background: white;
                box-shadow: 0 0 20px rgba(0,0,0,0.05);
                border-radius: 8px;
              }
              
              .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;
                padding-bottom: 20px;
              }
              
              .school-name {
                font-size: 24px;
                font-weight: 700;
                color: #2c3e50;
                margin-bottom: 5px;
              }
              
              .document-title {
                font-size: 20px;
                font-weight: 600;
                color: #3498db;
                margin: 10px 0;
              }
              
              .class-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
                font-size: 14px;
                color: #7f8c8d;
              }
              
              .student-list {
                width: 100%;
                margin-top: 20px;
                counter-reset: student-counter;
              }
              
              .student-item {
                padding: 12px 15px;
                border-bottom: 1px solid #ecf0f1;
                display: flex;
                align-items: center;
              }
              
              .student-item::before {
                counter-increment: student-counter;
                content: counter(student-counter) ".";
                margin-right: 15px;
                font-weight: 500;
                color: #3498db;
                min-width: 30px;
              }
              
              .student-item:nth-child(even) {
                background-color: #f8f9fa;
              }
              
              .footer {
                margin-top: 30px;
                text-align: right;
                font-size: 12px;
                color: #95a5a6;
                border-top: 1px solid #ecf0f1;
                padding-top: 15px;
              }
              
              .logo {
                height: 60px;
                margin-bottom: 15px;
              }
              
              @media print {
                body { 
                  background: none;
                  -webkit-print-color-adjust: exact;
                }
                
                .page-container {
                  box-shadow: none;
                  margin: 0;
                  padding: 10px;
                }
                
                .no-print {
                  display: none;
                }
              }
            </style>
          </head>
          <body>
            <div class="page-container">
              <div class="header">
                ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" class="logo">` : ''}
                <div class="school-name">${schoolName}</div>
                <div class="document-title">Liste des Élèves</div>
              </div>
              
              <div class="class-info">
                <div><strong>Classe:</strong> ${selectedClass?.nom} (${selectedClass?.niveau})</div>
                <div><strong>Date:</strong> ${formattedDate}</div>
              </div>
              
              <div class="student-list">
                ${studentsInClass.map(student => `
                  <div class="student-item">${student}</div>
                `).join('')}
              </div>
              
              <div class="footer">
                <div>Total élèves: ${studentsInClass.length}</div>
                <div>Document généré le ${currentDate.toLocaleString()}</div>
              </div>
              
              <button onclick="window.print()" class="no-print" style="
                background: #3498db;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                margin-top: 20px;
                font-family: inherit;
              ">Imprimer</button>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  } catch (error) {
    console.error("Erreur lors de la génération du document:", error);
    toast({
      title: t.common.error,
      description: t.userManagement.printError,
      variant: "destructive",
    });
  }
};
  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    classe_id: '',
    annee_scolaire_id: '',
    date_inscription: new Date().toISOString().split('T')[0],
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

  const [sortConfigUsers, setSortConfigUsers] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>(null);
  const [sortConfigInscriptions, setSortConfigInscriptions] = useState<{ key: 'utilisateur' | 'classe' | 'annee_scolaire' | 'actif'; direction: 'ascending' | 'descending' } | null>(null);

  const { toast } = useToast();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  useEffect(() => {
    async function fetchData() {
      setIsLoadingUsers(true);
      setIsLoadingInscriptions(true);
      try {
        const [usersRes, classesRes, yearsRes] = await Promise.all([
          fetch(`${API_URL}/api/users`),
          fetch(`${API_URL}/api/classes`),
          fetch(`${API_URL}/api/annees-academiques`),
        ]);

        if (!usersRes.ok || !classesRes.ok || !yearsRes.ok) {
          throw new Error(t.userManagement.toasts.initialDataError);
        }

        const [usersData, classesData, yearsData] = await Promise.all([
          usersRes.json(),
          classesRes.json(),
          yearsRes.json(),
        ]);

        setClasses(classesData);
        setAcademicYears(yearsData);

        const inscriptionsRes = await fetch(`${API_URL}/api/inscriptions`);
        if (!inscriptionsRes.ok) {
          throw new Error(t.userManagement.toasts.initialDataError);
        }
        const inscriptionsData: Inscription[] = await inscriptionsRes.json();
        const linkedInscriptions = inscriptionsData.map(inscription => ({
          ...inscription,
          utilisateur: usersData.find((u: User) => u.id === inscription.utilisateur.id) || inscription.utilisateur,
          classe: classesData.find((c: Classe) => c.id === inscription.classe.id) || inscription.classe,
          annee_scolaire: yearsData.find((a: AnneeScolaire) => a.id === inscription.annee_scolaire.id) || inscription.annee_scolaire,
        }));
        setInscriptions(linkedInscriptions);
        const usersWithInscriptions = usersData.map((user: User) => ({
          ...user,
          inscriptions: linkedInscriptions.filter((insc: Inscription) => insc.utilisateur.id === user.id),
        }));
        setUsers(usersWithInscriptions);

      } catch (error) {
        console.error(error);
        toast({
          title: t.common.error,
          description: t.userManagement.toasts.initialDataError,
          variant: "destructive",
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingInscriptions(false);
      }
    }
    fetchData();
  }, [toast, t]);

  const handleUserFormChange = useCallback((field: keyof typeof userFormData) => (value: any) => {
    setUserFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleInscriptionFormChange = useCallback((field: keyof typeof inscriptionFormData) => (value: any) => {
    setInscriptionFormData(prev => ({ ...prev, [field]: value }));
  }, []);

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
        role: userFormData.role === "" ? 'eleve' : userFormData.role,
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

      if (editUser) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/users/${editUser.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t.userManagement.toasts.userCreateUpdateError);
        }

        const updatedUser: User = await response.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
        );

        toast({
          title: t.userManagement.toasts.userUpdated,
          description: t.userManagement.toasts.userUpdatedSuccess.replace('{user}', `${updatedUser.prenom} ${updatedUser.nom}`),
          variant: "default",
        });

        setEditUser(null);
        setIsAddUserDialogOpen(false);
        setIsSubmitting(false);
        return;
      }

      const token = localStorage.getItem('token');
      const userResponse = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      });

      if (!userResponse.ok) {
        const errorData = await userResponse.json();
        throw new Error(errorData.message || t.userManagement.toasts.userCreateUpdateError);
      }

      const responseData = await userResponse.json();
      const newUser: User = responseData.user || responseData;
      setUsers((prev) => [...prev, newUser]);

      if (responseData.motDePasse) {
        setGeneratedPassword({
          password: responseData.motDePasse,
          nom: newUser.nom,
          prenom: newUser.prenom,
          email: newUser.email,
        });
      }

      if (newUser.role === 'eleve') {
        setActiveTab('inscriptions');
        setInscriptionFormData(prev => ({
          ...prev,
          utilisateur_id: String(newUser.id),
          tuteurNom: newUser.tuteurNom || '',
          tuteurTelephone: newUser.tuteurTelephone || '',
          classe_id: userFormData.classe_id,
          annee_scolaire_id: userFormData.annee_scolaire_id,
        }));
        setTimeout(() => setIsAddInscriptionDialogOpen(true), 200);
      }

      toast({
        title: t.common.success,
        description: t.userManagement.toasts.userAddedSuccess.replace('{user}', `${newUser.prenom} ${newUser.nom}`),
        variant: "default",
      });

      setUserFormData({
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
      setIsAddUserDialogOpen(false);

    } catch (error) {
      console.error("Erreur lors de la création/mise à jour de l'utilisateur:", error);
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.userManagement.toasts.userCreateUpdateError,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInscriptionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!inscriptionFormData.utilisateur_id || !inscriptionFormData.classe_id || !inscriptionFormData.annee_scolaire_id) {
        throw new Error(t.userManagement.toasts.selectStudentClassYearError);
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/inscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
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
        throw new Error(errorData.message || t.userManagement.toasts.registrationAddError);
      }

      const newInscription: Inscription = await response.json();
      const linkedInscription = {
        ...newInscription,
        utilisateur: users.find(u => u.id === newInscription.utilisateur.id) || newInscription.utilisateur,
        classe: classes.find(c => c.id === newInscription.classe.id) || newInscription.classe,
        annee_scolaire: academicYears.find(a => a.id === newInscription.annee_scolaire.id) || newInscription.annee_scolaire,
      };

      setInscriptions(prev => [...prev, linkedInscription]);

      toast({
        title: t.common.success,
        description: t.userManagement.toasts.registrationAddedSuccess,
        variant: "default",
      });

      setInscriptionFormData({
        utilisateur_id: '', 
        classe_id: '', 
        annee_scolaire_id: '', 
        date_inscription: new Date().toISOString().split('T')[0], 
        actif: true,
      });
      setIsAddInscriptionDialogOpen(false);

    } catch (error) {
      console.error("Erreur lors de la création de l'inscription:", error);
      toast({
        title: t.common.error,
        description: error instanceof Error ? error.message : t.userManagement.toasts.registrationAddError,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestSortUsers = (key: SortKey) => {
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
      (filterRole === 'all' || user.role === filterRole) &&
      (user.nom.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
        user.prenom.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTermUsers.toLowerCase()) ||
        (user.tuteurNom && user.tuteurNom.toLowerCase().includes(searchTermUsers.toLowerCase())))
    );
  }, [sortedUsers, searchTermUsers, filterRole]);

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

  const [filterClasseId, setFilterClasseId] = useState<string>('all');
  const [filterAnneeId, setFilterAnneeId] = useState<string>('all');



  const availableClassesForSelectedYear = useMemo(() => {
    if (!userFormData.annee_scolaire_id) {
      return classes;
    }
    const selectedYearId = parseInt(userFormData.annee_scolaire_id, 10);
    return classes.filter(classe => classe.annee_scolaire_id === selectedYearId);
  }, [classes, userFormData.annee_scolaire_id]);

  useEffect(() => {
    if (userFormData.annee_scolaire_id && userFormData.classe_id) {
      const selectedYearId = parseInt(userFormData.annee_scolaire_id, 10);
      const currentSelectedClass = availableClassesForSelectedYear.find(c => c.id === parseInt(userFormData.classe_id, 10));
      if (!currentSelectedClass || currentSelectedClass.annee_scolaire_id !== selectedYearId) {
        setUserFormData(prev => ({ ...prev, classe_id: '' }));
      }
    }
  }, [userFormData.annee_scolaire_id, userFormData.classe_id, availableClassesForSelectedYear]);

  useEffect(() => {
    if (editUser) {
      let classe_id = '';
      let annee_scolaire_id = '';
      let date_inscription = new Date().toISOString().split('T')[0];

      if (editUser.inscriptions && editUser.inscriptions.length > 0) {
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
  
  const availableClassesForInscriptionFilter = useMemo(() => {
    if (!filterAnneeId || filterAnneeId === 'all') {
      return classes;
    }
    const selectedYearIdNum = parseInt(filterAnneeId, 10);
    return classes.filter(classe => classe.annee_scolaire_id === selectedYearIdNum);
  }, [classes, filterAnneeId]);

  useEffect(() => {
    if (filterAnneeId && filterAnneeId !== 'all' && filterClasseId && filterClasseId !== 'all') {
      if (!availableClassesForInscriptionFilter.some(c => String(c.id) === filterClasseId)) {
        setFilterClasseId('all');
      }
    }
  }, [filterAnneeId, filterClasseId, availableClassesForInscriptionFilter]);

  return (
 <div
      className="flex flex-col bg-gray-50 dark:bg-gray-900 p-6 box-border overflow-auto">
      {/* Ici ton contenu */}
      <div className="mb-4 flex flex-col md:flex-row justify-center items-stretch md:items-center gap-3 md:gap-4">
   <Button
    onClick={() => setActiveTab('users')}
    className={cn(
      "px-8 py-3 text-lg rounded-xl transition-all duration-300 ease-in-out w-full md:w-auto",
      activeTab === 'users'
        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg-soft"
        : "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
    )}
  >
    {t.userManagement.tabs.users}
  </Button>
  <Button
    onClick={() => setActiveTab('inscriptions')}
    className={cn(
      "px-8 py-3 text-lg rounded-xl transition-all duration-300 ease-in-out w-full md:w-auto",
      activeTab === 'inscriptions'
        ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg-soft"
        : "bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
    )}
  >
    {t.userManagement.tabs.registrations}
  </Button>
</div>

      {activeTab === 'users' && (
        <>
          <div className="flex justify-center md:justify-end mb-6">
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t.userManagement.addUser}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0 bg-white dark:bg-gray-950 rounded-3xl shadow-soft-xl border border-gray-50 dark:border-gray-850">
                <div className="relative bg-gradient-to-br from-blue-300 to-indigo-400 dark:from-blue-700 dark:to-indigo-800 px-8 py-7 rounded-t-3xl overflow-hidden">
                  <div className="absolute inset-0 z-0 opacity-20 dark:opacity-10">
                    <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
                      <path fill="#ffffff" fillOpacity="0.1" d="M0,192L48,176C96,160,192,128,288,106.7C384,85,480,75,576,85.3C672,96,768,128,864,138.7C960,149,1056,139,1152,122.7C1248,107,1344,85,1392,74.7L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                      <path fill="#ffffff" fillOpacity="0.05" d="M0,96L48,101.3C96,107,192,117,288,138.7C384,160,480,192,576,170.7C672,149,768,75,864,69.3C960,64,1056,128,1152,149.3C1248,171,1344,149,1392,138.7L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"></path>
                    </svg>
                  </div>
                  <DialogHeader className="relative z-10">
                    <DialogTitle className="flex items-center gap-4 text-3xl font-extrabold text-white leading-tight drop-shadow-sm">
                      <User className="h-8 w-8 text-white animate-fade-in-up" />
                      <span>{t.userManagement.userForm.title}</span>
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 dark:text-blue-200 mt-2 text-base max-w-md drop-shadow-sm">
                      {t.userManagement.userForm.description}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              
                <form onSubmit={handleAddUserSubmit} className="p-8 space-y-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                    <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {t.userManagement.userForm.personalInfo}
                    </h3>
                
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="nom" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.name} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="nom"
                          type="text"
                          required
                          placeholder={t.userManagement.userForm.name}
                          value={userFormData.nom}
                          onChange={e => setUserFormData(prev => ({ ...prev, nom: e.target.value }))}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                        />
                      </div>
                
                      <div className="space-y-2">
                        <Label htmlFor="prenom" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.firstName} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="prenom"
                          type="text"
                          required
                          placeholder={t.userManagement.userForm.firstName}
                          value={userFormData.prenom}
                          onChange={e => setUserFormData(prev => ({ ...prev, prenom: e.target.value }))}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                        />
                      </div>
                
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.email} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          placeholder={t.userManagement.userForm.email}
                          value={userFormData.email}
                          onChange={e => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                        />
                      </div>
                
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.gender}
                        </Label>
                        <Select
                          value={userFormData.genre}
                          onValueChange={(value) => setUserFormData(prev => ({ ...prev, genre: value as 'masculin' | 'feminin' | '' }))}
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.userForm.selectGender} />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                            <SelectItem value="masculin">{t.userManagement.userForm.male}</SelectItem>
                            <SelectItem value="feminin">{t.userManagement.userForm.female}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                    <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {t.userManagement.userForm.profilePicture}
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
                            aria-label={t.userManagement.userForm.deletePicture}
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
                            <span className="font-medium">
                              {userFormData.photoUrl ? t.userManagement.userForm.changePicture : t.userManagement.userForm.addPicture}
                            </span>
                          </div>
                        </Button>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-light mt-1">
                          {t.userManagement.userForm.pictureFormats}
                        </span>
                      </label>
                    </div>
                  </div>
                
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                    <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 14l9-5-9-5-9 5 9 5z" />
                        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                      </svg>
                      {t.userManagement.userForm.roleAndSchooling}
                    </h3>
                
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.role} <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={userFormData.role}
                          onValueChange={(value) => setUserFormData({ ...userFormData, role: value as UserRole })}
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.userForm.selectRole} />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                            <SelectItem value="admin" className="group flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900 hover:text-purple-700 dark:hover:text-purple-300 transition-colors duration-150">
                              <Shield className="h-4 w-4 text-purple-500 group-hover:text-purple-700 dark:group-hover:text-purple-300" />
                              <span>{t.userManagement.userForm.admin}</span>
                            </SelectItem>
                            <SelectItem value="professeur" className="group flex items-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300">
                              <GraduationCap className="h-4 w-4 text-blue-500 group-hover:text-blue-700 dark:group-hover:text-blue-300" />
                              <span>{t.userManagement.userForm.teacher}</span>
                            </SelectItem>
                            <SelectItem value="eleve" className="group flex items-center gap-2 hover:bg-green-100 dark:hover:bg-green-900 hover:text-green-700 dark:hover:text-green-300">
                              <BookOpen className="h-4 w-4 text-green-500 group-hover:text-green-700 dark:group-hover:text-green-300" />
                              <span>{t.userManagement.userForm.student}</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                
                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.schoolYear}
                        </Label>
                        <Select
                          value={userFormData.annee_scolaire_id}
                          onValueChange={(value) => {
                            setUserFormData({
                              ...userFormData,
                              annee_scolaire_id: value,
                            });
                          }}
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.userForm.selectYear} />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                            {academicYears.length === 0 ? (
                              <SelectItem value="no-years-available" disabled>
                                {t.userManagement.userForm.noYearAvailable}
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

                      <div className="space-y-2">
                        <Label className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.class}
                        </Label>
                        {(() => {
                          const classesToDisplay = availableClassesForSelectedYear;
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
                              disabled={isClasseDisabled}
                            >
                              <SelectTrigger className={`h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm ${isClasseDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                <SelectValue placeholder={t.userManagement.userForm.selectClass} />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg animate-fade-in-down">
                                {classesToDisplay.length === 0 ? (
                                  <SelectItem value="no-classes-available" disabled>
                                    {userFormData.annee_scolaire_id ? t.userManagement.userForm.noClassForYear : t.userManagement.userForm.selectYearFirst}
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
                
                      <div className="space-y-2">
                        <Label htmlFor="date_inscription" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.registrationDate} <span className="text-red-500">*</span>
                        </Label>
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
                
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-850 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm-light transform transition-transform duration-300 hover:scale-[1.005]">
                    <h3 className="flex items-center gap-3 text-base font-semibold text-blue-700 dark:text-blue-300 mb-5 pb-3 border-b border-blue-200/60 dark:border-gray-700/60">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {t.userManagement.userForm.coordinatesAndStatus}
                    </h3>
                
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="adresse" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.address}
                        </Label>
                        <Input
                          id="adresse"
                          type="text"
                          placeholder={t.userManagement.userForm.address}
                          value={userFormData.adresse}
                          onChange={e => handleUserFormChange('adresse')(e.target.value)}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm"
                        />
                      </div>
                
                      <div className="space-y-2">
                        <Label htmlFor="tuteur" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.tutorName}
                        </Label>
                        <Input
                          id="tuteur"
                          type="text"
                          placeholder={t.userManagement.userForm.tutorName}
                          value={userFormData.tuteurNom}
                          onChange={e => handleUserFormChange('tuteurNom')(e.target.value)}
                          disabled={userFormData.role !== 'eleve'}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tuteur_telephone" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.userForm.tutorPhone}
                        </Label>
                        <Input
                          id="tuteur_telephone"
                          type="text"
                          placeholder={t.userManagement.userForm.tutorPhone}
                          value={userFormData.tuteurTelephone}
                          onChange={e => handleUserFormChange('tuteurTelephone')(e.target.value)}
                          disabled={userFormData.role !== 'eleve'}
                          className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      
                      <div className="flex items-center justify-between pt-4">
                        <Label htmlFor="actif" className="text-gray-700 dark:text-gray-200 text-sm font-medium cursor-pointer">
                          {t.userManagement.userForm.activeAccount}
                        </Label>
                        <Switch
                          id="actif"
                          checked={userFormData.actif}
                          onCheckedChange={(checked) => setUserFormData({...userFormData, actif: checked})}
                          className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600 transition-colors duration-200 ease-in-out"
                        />
                      </div>
                    </div>
                  </div>
                
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddUserDialogOpen(false)}
                      className="px-7 py-3 rounded-xl border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      {t.common.cancel}
                    </Button>
                    {!editUser && (
                      <Button
                        type="submit"
                        className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg-soft transition-all duration-300 ease-in-out hover:shadow-xl-soft transform hover:-translate-y-1"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t.userManagement.userForm.createUser}
                      </Button>
                    )}
                    {editUser && (
                      <Button type="submit">
                        {t.userManagement.userForm.updateUser}
                      </Button>
                    )}
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          
          <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 py-6">
  {/* Titre */}
  <CardTitle className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">
    {t.userManagement.userList}
  </CardTitle>

  {/* Filtres + Recherche */}
  <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-start sm:items-center">
    {/* Boutons filtres */}
    <div className="flex flex-wrap gap-2 px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
      {[
        { key: 'all', icon: <UsersIcon className="h-4 w-4" />, label: t.userManagement.userForm.roles?.all || 'Tous' },
        { key: 'admin', icon: <Shield className="h-4 w-4" />, label: t.userManagement.userForm.admin },
        { key: 'professeur', icon: <GraduationCap className="h-4 w-4" />, label: t.userManagement.userForm.teacher },
        { key: 'eleve', icon: <BookOpen className="h-4 w-4" />, label: t.userManagement.userForm.student },
      ].map(({ key, icon, label }) => {
        const isActive = filterRole === key;
        return (
          <button
            key={key}
onClick={() => setFilterRole(key as "all" | UserRole)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-200
              ${
                isActive
                  ? "bg-blue-600 text-white shadow hover:bg-blue-700"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>

    {/* Barre de recherche */}
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
      <input
        type="text"
        placeholder={t.userManagement.searchUserPlaceholder}
        value={searchTermUsers}
        onChange={(e) => setSearchTermUsers(e.target.value)}
        className="pl-10 pr-4 py-2 w-full text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
  </div>
</div>

            </CardHeader>
            <CardContent className="p-0">
              {isLoadingUsers ? (
                <div className="space-y-4 p-6">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortUsers('nom')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.fullName}<SortIcon column="nom" sortConfig={sortConfigUsers} /></div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortUsers('email')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.email}<SortIcon column="email" sortConfig={sortConfigUsers} /></div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <div className="flex items-center">{t.userManagement.tableHeaders.role}</div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortUsers('actif')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.status}<SortIcon column="actif" sortConfig={sortConfigUsers} /></div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Avatar className={`h-10 w-10 border border-gray-200 dark:border-gray-600 ${
  language === 'ar' ? 'ml-3' : 'mr-3'
}`}>
  <AvatarImage src={user.photoUrl} />
  <AvatarFallback className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
    {language === 'ar' ? 
      `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}` :
      `${user.nom?.[0] || ''}${user.prenom?.[0] || ''}`
    }
  </AvatarFallback>
</Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent><img src={user.photoUrl || '/default-user.png'} alt={`${user.nom} ${user.prenom}`} className="h-24 w-24 rounded-md object-cover" /></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <div>
                                  <div className="font-medium text-blue-700 dark:text-blue-300 cursor-pointer underline hover:text-blue-900" onClick={() => setEditUser(user)} title={t.common.edit}>
                                    {user.nom} {user.prenom}
                                  </div>
                                  {user.tuteurNom && <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t.userManagement.mobile.tutor}: {user.tuteurNom}
                                  </div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{user.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${roleColors[user.role]} capitalize`}>
                                {user.role === 'admin' ? t.userManagement.userForm.admin : 
                                 user.role === 'professeur' ? t.userManagement.userForm.teacher : 
                                 t.userManagement.userForm.student}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {user.actif ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" />
                                  {t.common.status.active}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" />
                                  {t.common.status.inactive}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="block lg:hidden p-4 space-y-4">
                    {filteredUsers.length === 0 ? (
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                        {searchTermUsers ? t.common.noDataAvailable : t.common.noDataAvailable}
                      </div>
                    ) : (
                      filteredUsers.map((user) => (
                        <Card key={user.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setEditUser(user)}>
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={user.photoUrl || undefined} />
                              <AvatarFallback>{user.nom?.[0]}{user.prenom?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
                                {user.nom} {user.prenom}
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                {user.email}
                              </CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2 text-sm space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.role}:
                              </span>
                              <Badge className={`${roleColors[user.role]} capitalize`}>
                                {user.role === 'admin' ? t.userManagement.userForm.admin : 
                                 user.role === 'professeur' ? t.userManagement.userForm.teacher : 
                                 t.userManagement.userForm.student}
                              </Badge>
                            </div>
                            {user.tuteurNom && (
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-600 dark:text-gray-300">
                                  {t.userManagement.mobile.tutor}:
                                </span>
                                <span className="text-gray-800 dark:text-gray-100">
                                  {user.tuteurNom}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.status}:
                              </span>
                              {user.actif ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" /> {t.common.status.active}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" /> {t.common.status.inactive}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === 'inscriptions' && (
        <>
          <div className="flex justify-center md:justify-end mb-6">
            <Dialog open={isAddInscriptionDialogOpen} onOpenChange={setIsAddInscriptionDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  {t.userManagement.addRegistration}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t.userManagement.registrationForm.title}
                  </DialogTitle>
                  <DialogDescription className="text-gray-500 dark:text-gray-400">
                    {t.userManagement.registrationForm.description}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddInscriptionSubmit} className="grid gap-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {t.userManagement.registrationForm.info}
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="utilisateur_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.registrationForm.userStudent}
                        </Label>
                        <Select
                          value={inscriptionFormData.utilisateur_id}
                          onValueChange={handleInscriptionFormChange('utilisateur_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.registrationForm.userStudent} />
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
                        <Label htmlFor="classe_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.tableHeaders.class}
                        </Label>
                        <Select
                          value={inscriptionFormData.classe_id}
                          onValueChange={handleInscriptionFormChange('classe_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.userForm.selectClass} />
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
                        <Label htmlFor="annee_scolaire_id" className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                          {t.userManagement.tableHeaders.schoolYear}
                        </Label>
                        <Select
                          value={inscriptionFormData.annee_scolaire_id}
                          onValueChange={handleInscriptionFormChange('annee_scolaire_id')}
                          required
                        >
                          <SelectTrigger className="h-11 px-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-200 ease-in-out shadow-xs hover:shadow-sm">
                            <SelectValue placeholder={t.userManagement.userForm.selectYear} />
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

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {t.userManagement.registrationForm.status}
                      </h3>
                       <div className={`flex items-center justify-between pt-4 ${
      language === 'ar' ? 'flex-row-reverse' : ''
    }`}>
      <Label htmlFor="actif" className="text-gray-700 dark:text-gray-200 text-sm font-medium cursor-pointer">
    {t.userManagement.userForm.activeAccount}
      </Label>
      <Switch
        id="actif"
        checked={userFormData.actif}
        onCheckedChange={(checked) => setUserFormData({...userFormData, actif: checked})}
        className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-600"
      />
      <span className="text-sm ms-2">
        {userFormData.actif ? t.userManagement.active : t.userManagement.inactive}
      </span>
    </div>
                    </div>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-4 pt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddInscriptionDialogOpen(false)}
                      className="px-7 py-3 rounded-xl border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md"
                    >
                      {t.common.cancel}
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-7 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg-soft transition-all duration-300 ease-in-out hover:shadow-xl-soft transform hover:-translate-y-1"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.userManagement.registrationForm.creating}
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          {t.userManagement.registrationForm.createRegistration}
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
    <CardTitle className="text-lg text-gray-900 dark:text-white">
      {t.userManagement.registrationList}
    </CardTitle>
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      {/* Bouton d'impression ajouté ici */}
      <Button
  variant="outline"
  onClick={() => {
    if (filterClasseId && filterClasseId !== 'all') {
      handlePrintClassStudents(parseInt(filterClasseId));
    } else {
      toast({
        title: t.common.warning,
        description: t.userManagement.selectClassFirst,
        variant: "default",
      });
    }
  }}
  className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 dark:from-gray-700 dark:to-gray-800 dark:hover:from-gray-600 dark:hover:to-gray-700 border border-blue-200 dark:border-gray-600 text-blue-600 dark:text-blue-300 hover:text-blue-700 dark:hover:text-blue-200 shadow-sm"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
  {t.userManagement.printClassList}
</Button>
      
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
        <Input
          placeholder={t.userManagement.searchRegistrationPlaceholder}
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
          <SelectValue placeholder={t.common.allYears} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.common.allYears}</SelectItem>
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
                disabled={filterAnneeId === 'all'}

      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder={t.common.allClasses} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t.common.allClasses}</SelectItem>
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
            <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
              {isLoadingInscriptions ? (
                <div className="space-y-4 p-6">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-md bg-gray-200 dark:bg-gray-700" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortInscriptions('utilisateur')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.studentFullName}<SortIcon column="utilisateur" sortConfig={sortConfigInscriptions} /></div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortInscriptions('classe')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.class}<SortIcon column="classe" sortConfig={sortConfigInscriptions} /></div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortInscriptions('annee_scolaire')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.schoolYear}<SortIcon column="annee_scolaire" sortConfig={sortConfigInscriptions} /></div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            <div className="flex items-center">{t.userManagement.tableHeaders.role}</div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group" onClick={() => requestSortInscriptions('actif')}>
                            <div className="flex items-center">{t.userManagement.tableHeaders.status}<SortIcon column="actif" sortConfig={sortConfigInscriptions} /></div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredInscriptions.map((inscription) => (
                          <tr key={inscription.id} className="hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors cursor-pointer" onClick={() => handleEditUserFromInscription(inscription)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Avatar className={`h-10 w-10 border border-gray-200 dark:border-gray-600 ${
  language === 'ar' ? 'ml-3' : 'mr-3'
}`}>
  <AvatarImage src={inscription.utilisateur.photoUrl || undefined} />
  <AvatarFallback>
    {language === 'ar' ? 
      `${inscription.utilisateur.prenom?.[0]}${inscription.utilisateur.nom?.[0]}` :
      `${inscription.utilisateur.nom?.[0]}${inscription.utilisateur.prenom?.[0]}`
    }
  </AvatarFallback>
</Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent><img src={inscription.utilisateur.photoUrl || '/default-user.png'} alt={`${inscription.utilisateur.prenom} ${inscription.utilisateur.nom}`} className="h-24 w-24 rounded-md object-cover" /></TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {inscription.utilisateur.prenom} {inscription.utilisateur.nom}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {inscription.utilisateur.email}
                                  </div>
                                  {inscription.utilisateur.tuteurNom && <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {t.userManagement.mobile.tutor}: {inscription.utilisateur.tuteurNom}
                                  </div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {inscription.classe.nom}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {inscription.classe.niveau}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {inscription.annee_scolaire.libelle}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={`${roleColors[inscription.utilisateur.role]} capitalize`}>
                                {inscription.utilisateur.role === 'admin' ? t.userManagement.userForm.admin : 
                                 inscription.utilisateur.role === 'professeur' ? t.userManagement.userForm.teacher : 
                                 t.userManagement.userForm.student}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {inscription.actif ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" />{t.common.status.active}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" />{t.common.status.inactive}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="block lg:hidden p-4 space-y-4">
                    {filteredInscriptions.length === 0 ? (
                      <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                        {searchTermInscriptions ? t.common.noDataAvailable : t.common.noDataAvailable}
                      </div>
                    ) : (
                      filteredInscriptions.map((inscription) => (
                        <Card key={inscription.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => handleEditUserFromInscription(inscription)}>
                          <CardHeader className="flex flex-row items-center gap-4 pb-2">
                            <Avatar className="h-12 w-12 border-2 border-white dark:border-gray-700">
                              <AvatarImage src={inscription.utilisateur.photoUrl || undefined} />
                              <AvatarFallback>{inscription.utilisateur.prenom?.[0]}{inscription.utilisateur.nom?.[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
                                {inscription.utilisateur.prenom} {inscription.utilisateur.nom}
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500 dark:text-gray-400">
                                {inscription.utilisateur.email}
                              </CardDescription>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-2 text-sm space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.class}:
                              </span>
                              <span className="text-gray-800 dark:text-gray-100 font-semibold">
                                {inscription.classe.nom} ({inscription.classe.niveau})
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.schoolYear}:
                              </span>
                              <span className="text-gray-800 dark:text-gray-100">
                                {inscription.annee_scolaire.libelle}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.role}:
                              </span>
                              <Badge className={`${roleColors[inscription.utilisateur.role]} capitalize`}>
                                {inscription.utilisateur.role === 'admin' ? t.userManagement.userForm.admin : 
                                 inscription.utilisateur.role === 'professeur' ? t.userManagement.userForm.teacher : 
                                 t.userManagement.userForm.student}
                              </Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="font-medium text-gray-600 dark:text-gray-300">
                                {t.userManagement.tableHeaders.status}:
                              </span>
                              {inscription.actif ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                  <Check className="h-3 w-3 mr-1" /> {t.common.status.active}
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                  <X className="h-3 w-3 mr-1" /> {t.common.status.inactive}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </>
              )}
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
              <h2 className="text-2xl font-bold mb-2 text-blue-900 dark:text-blue-100">
                {t.userManagement.passwordModal.title}
              </h2>
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 text-xs font-semibold">
                  <Info className="h-4 w-4 mr-1" /> {t.userManagement.passwordModal.important}
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
                {t.userManagement.passwordModal.info}<br />
                <span className="text-red-500 font-medium">
                  {t.userManagement.passwordModal.warning}
                </span>
              </p>
              <div className="w-full bg-white dark:bg-gray-900 rounded-lg shadow p-4 mb-4 space-y-2 border border-gray-100 dark:border-gray-700 text-left">
                <div>
                  <span className="font-semibold">{t.userManagement.userForm.name}:</span> {generatedPassword.nom}
                </div>
                <div>
                  <span className="font-semibold">{t.userManagement.userForm.firstName}:</span> {generatedPassword.prenom}
                </div>
                <div>
                  <span className="font-semibold">{t.userManagement.userForm.email}:</span> {generatedPassword.email}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{t.userManagement.passwordModal.password}</span>
                  <PasswordReveal password={generatedPassword.password} showPasswordText={''} hidePasswordText={''} />
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
                        title: t.userManagement.passwordModal.toastCopied,
                        variant: "default",
                      });
                    }}
                  >
                    {t.userManagement.passwordModal.copy}
                  </Button>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mb-2"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${t.userManagement.userForm.name}: ${generatedPassword.nom}\n${t.userManagement.userForm.firstName}: ${generatedPassword.prenom}\n${t.userManagement.userForm.email}: ${generatedPassword.email}\n${t.userManagement.passwordModal.password}: ${generatedPassword.password}`
                  );
                  toast({
                    title: t.userManagement.passwordModal.toastAllCopiedTitle,
                    description: t.userManagement.passwordModal.toastAllCopiedDescription,
                    variant: "default",
                  });
                }}
              >
                {t.userManagement.passwordModal.copyAll}
              </Button>
              <Button
                onClick={() => setGeneratedPassword(null)}
                className="mt-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow"
              >
                {t.common.close}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}