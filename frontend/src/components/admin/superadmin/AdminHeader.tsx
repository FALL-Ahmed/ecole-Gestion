import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminHeader: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white dark:bg-gray-800 text-gray-800 dark:text-white px-6 flex items-center justify-between shadow-md z-30 border-b border-gray-200 dark:border-gray-700">
      <div className="text-xl font-bold">
        Madrastak - Administration
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5" />
          <span>{user?.email}</span>
        </div>
        <Button variant="destructive" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </Button>
      </div>
    </header>
  );
};

