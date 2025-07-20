import React from 'react';
import AdminDashboard from './AdminDashboard';
import EcolesAdminPage from './EcolesAdminPage';
import { Settings } from '../Settings';

interface AdminMainContentProps {
  activeSection: string;
}

export const AdminMainContent: React.FC<AdminMainContentProps> = ({ activeSection }) => {
  switch (activeSection) {
    case 'dashboard':
      return <AdminDashboard />;
    case 'ecoles':
      return <EcolesAdminPage />;
    case 'settings':
      // Note: La page des paramètres est réutilisée. Elle pourrait nécessiter des ajustements.
      return <Settings />;
    default:
      return <AdminDashboard />;
  }
};

