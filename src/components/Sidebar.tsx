
import React, { useState, useEffect } from 'react';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext'; // Import the context hook
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Home, 
  Users, 
  BookOpen, 
  GraduationCap,
  Calendar,
  FileText,
  UserCheck,
  LogOut,
  BarChart3,
  Settings,
  FileSpreadsheet,
  Upload,
  Clock,
  CheckSquare,
  School
} from 'lucide-react';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user, logout } = useAuth();
    const { schoolName } = useEstablishmentInfo(); // Use the schoolName from context


  
  const getMenuItems = () => {
    const commonItems = [
      { id: 'dashboard', label: 'Tableau de bord', icon: Home }
    ];

    switch (user?.role) {
      case 'admin':
        return [
          ...commonItems,
          { id: 'users', label: 'Gestion Utilisateurs', icon: Users },
          { id: 'scolaire', label: 'Gestion Scolaire', icon: School },
          { id: 'grades', label: 'Gestion Notes', icon: GraduationCap },
          { id: 'schedule', label: 'Emploi du Temps', icon: Calendar },
          { id: 'attendance', label: 'Gestion Absences', icon: UserCheck },
          { id: 'reports', label: 'Bulletins Scolaires', icon: FileSpreadsheet },
          { id: 'chapter-monitoring', label: 'Suivi des Chapitres', icon: CheckSquare },
          { id: 'stats', label: 'Statistiques', icon: BarChart3 },
          { id: 'settings', label: 'Paramètres', icon: Settings }
        ];
      case 'professeur':
        return [
          ...commonItems,
        
          { id: 'schedule-view', label: 'Emploi du Temps', icon: Calendar },
          { id: 'grades-input', label: 'Saisie des Notes', icon: GraduationCap },
          { id: 'course-materials', label: 'Supports de Cours', icon: Upload },
          { id: 'chapter-planning', label: 'Planification Chapitres', icon: FileText }
        ];
      case 'eleve':
        return [
          ...commonItems,
          { id: 'schedule-view', label: 'Emploi du Temps', icon: Calendar },
          { id: 'my-courses', label: 'Mes Cours', icon: BookOpen },
          { id: 'my-grades', label: 'Mes Notes', icon: GraduationCap },
          { id: 'my-attendance', label: 'Mes Absences', icon: Clock },
        ];
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm">
      <div className="flex items-center justify-center p-6 border-b border-gray-200 bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center text-center">
          <div className="p-3 mb-3 rounded-full bg-blue-600 text-white shadow-lg">
            <School className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-black text-blue-900 tracking-tight drop-shadow-sm">{schoolName}</h2>
          <p className="text-xs text-gray-500 mt-1">Portail de Gestion</p>
        </div>
      </div>
      
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={`w-full justify-start rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ease-in-out group ${
                    activeSection === item.id 
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800"
                      : "text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm"
                  }`}
                  onClick={() => onSectionChange(item.id)}
                >
                  <Icon className="mr-3 h-4 w-4 transition-transform duration-200 ease-in-out group-hover:scale-110" />
                  {item.label}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={logout}
        >
          <LogOut className="mr-3 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
