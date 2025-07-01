import React, { useState, useEffect } from 'react';
import { LogOut, Menu, Moon, Sun, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  isSidebarOpen,
  toggleSidebar,
}) => {
  const { logout, user } = useAuth();
  const { schoolName } = useEstablishmentInfo();
  const navigate = useNavigate();

  const { language, toggleLanguage, t } = useLanguage();

  const [isDarkMode, setIsDarkMode] = useState(document.documentElement.classList.contains('dark'));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    document.documentElement.classList.toggle('dark');
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="fixed top-0 left-0 w-full h-[80px] z-50 bg-gradient-to-r from-blue-800 to-indigo-900 dark:from-gray-900 dark:to-gray-800 text-white px-4 sm:px-6 flex items-center justify-between shadow-2xl">

      {/* Menu burger gauche */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-white hover:bg-blue-700/80 dark:hover:bg-gray-700"
          aria-label={isSidebarOpen ? t.header.closeMenu : t.header.openMenu}
        >
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Centre : nom d’école */}
   <div className="flex-grow flex justify-center items-center relative">
  <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
    <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold tracking-tight text-white text-shadow-lg drop-shadow-md whitespace-nowrap">
      <span className="block truncate max-w-[calc(100vw-220px)] md:max-w-xl lg:max-w-2xl mx-auto">
        {schoolName || t.header.schoolNameDefault}
      </span>
      {schoolName && (
        <>
          <span 
            className="block mx-auto w-8 h-0.5 rounded-sm my-1"
            style={{
              background: 'linear-gradient(to right, transparent, transparent)',
            }}
          />
          <span className="absolute -bottom-2 sm:-bottom-3 left-1/2 -translate-x-1/2 text-sm font-normal text-current hidden sm:inline">
            {t.header.schoolPortal}
          </span>
        </>
      )}
    </h1>
  </div>
</div>

      {/* Droite : notifications, mode sombre, langue (desktop uniquement) */}
      <div className="flex items-center gap-3 sm:gap-4">

        {/* Notifications */}
        <div className="p-1 rounded-full border border-white hover:border-blue-300 transition-colors cursor-pointer">
          <NotificationBell />
        </div>

        {/* Mode sombre */}
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className="text-white hover:bg-blue-700/80 dark:hover:bg-gray-700 rounded-md p-2"
          aria-label={t.header.toggleTheme}
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Langue visible uniquement desktop */}
        {!isMobile && (
          <Button
            variant="ghost"
            onClick={toggleLanguage}
            className="flex items-center gap-2 text-white hover:bg-blue-700/80 dark:hover:bg-gray-700 rounded-md px-3 py-2"
            aria-label={t.header.toggleLanguage}
          >
            <Globe className="h-5 w-5" />
            <span className="font-semibold text-sm">{language === 'fr' ? 'AR' : 'FR'}</span>
          </Button>
        )}
      </div>
    </header>
  );
};
