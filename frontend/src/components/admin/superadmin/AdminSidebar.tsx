import React from 'react';
import { Home, School, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ activeSection, onSectionChange }) => {
  const { logout } = useAuth();
  const { t } = useLanguage();

  const menuItems = [
    { id: 'dashboard', label: t.sidebar.dashboard, icon: Home },
    { id: 'ecoles', label: "Gestion des Écoles", icon: School }, // Note: Pensez à ajouter cette traduction
    { id: 'settings', label: t.sidebar.settings, icon: Settings },
  ];

  return (
    <aside className="fixed top-0 left-0 z-40 w-64 h-screen pt-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <nav className="flex-grow p-4">
        <ul className="space-y-2">
          {menuItems.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <Button
                variant={activeSection === id ? 'secondary' : 'ghost'}
                className="w-full justify-start text-base py-6"
                onClick={() => onSectionChange(id)}
              >
                <Icon className="mr-3 h-5 w-5" />
                {label}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <Button variant="outline" onClick={logout} className="w-full justify-start text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/50">
          <LogOut className="mr-3 h-5 w-5" />
          {t.sidebar.logout}
        </Button>
      </div>
    </aside>
  );
};

