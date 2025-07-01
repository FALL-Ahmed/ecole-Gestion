import React, { useState } from "react";
import {
  Home,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  FileText,
  UserCheck,
  BarChart3,
  Settings,
  FileSpreadsheet,
  Upload,
  Clock,
  CheckSquare,
  School,
  LogOut,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isSidebarOpen: boolean;
  onCloseSidebar: () => void;
  isMobile: boolean;
}

export function Sidebar({
  activeSection,
  onSectionChange,
  isSidebarOpen,
  onCloseSidebar,
  isMobile,
}: SidebarProps) {
  const { user, logout } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();
  const isRTL = language === "ar";

  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.classList.contains("dark")
  );

  const sidebarWidth = 256; // largeur en pixels

  const toggleTheme = () => {
    document.documentElement.classList.toggle("dark");
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = () => {
    logout();
  };

  const getMenuItems = () => {
    const commonItems = [{ id: "dashboard", label: t.sidebar.dashboard, icon: Home }];
    switch (user?.role) {
      case "admin":
        return [
          ...commonItems,
          { id: "users", label: t.sidebar.userManagement, icon: Users },
          { id: "scolaire", label: t.sidebar.schoolManagement, icon: School },
          { id: "grades", label: t.sidebar.gradeManagement, icon: GraduationCap },
          { id: "schedule", label: t.sidebar.schedule, icon: Calendar },
          { id: "attendance", label: t.sidebar.attendance, icon: UserCheck },
          { id: "reports", label: t.sidebar.reports, icon: FileSpreadsheet },
          { id: "chapter-monitoring", label: t.sidebar.chapterMonitoring, icon: CheckSquare },
          { id: "stats", label: t.sidebar.statistics, icon: BarChart3 },
          { id: "settings", label: t.sidebar.settings, icon: Settings },
        ];
      case "professeur":
        return [
          ...commonItems,
          { id: "schedule-view", label: t.sidebar.schedule, icon: Calendar },
          { id: "grades-input", label: t.sidebar.gradeEntry, icon: GraduationCap },
          { id: "course-materials", label: t.sidebar.courseMaterials, icon: Upload },
          { id: "chapter-planning", label: t.sidebar.chapterPlanning, icon: FileText },
        ];
      case "eleve":
        return [
          ...commonItems,
          { id: "schedule-view", label: t.sidebar.schedule, icon: Calendar },
          { id: "my-courses", label: t.sidebar.myCourses, icon: BookOpen },
          { id: "my-grades", label: t.sidebar.myGrades, icon: GraduationCap },
          { id: "my-attendance", label: t.sidebar.myAttendance, icon: Clock },
        ];
      default:
        return commonItems;
    }
  };

  const menuItems = getMenuItems();

  const variants = {
    open: { x: 0, transition: { duration: 0.3 } },
    closed: {
      x: isMobile ? (isRTL ? sidebarWidth : -sidebarWidth) : (isRTL ? sidebarWidth : -sidebarWidth),
      transition: { duration: 0.3 },
    },
  };

  return (
    <>
      <motion.aside
        className={`fixed top-0 z-40 h-screen pt-[80px] bg-white dark:bg-gray-900 flex flex-col
          ${isRTL ? "right-0 left-auto border-l border-gray-200 dark:border-gray-700" : "left-0 right-auto border-r border-gray-200 dark:border-gray-700"}
          w-64
        `}
        initial={false}
        animate={isSidebarOpen ? "open" : "closed"}
        variants={variants}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="flex flex-col flex-grow overflow-hidden">
          <nav
            className="flex-grow overflow-y-auto p-2"
            aria-label={t.sidebar.mainNavigation}
          >
            <ul className="space-y-1">
              {menuItems.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <Button
  variant={activeSection === id ? "default" : "ghost"}
  className={`w-full rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out group flex items-center
    ${
      activeSection === id
        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md hover:from-blue-700 hover:to-blue-800"
        : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-indigo-900 hover:text-blue-700 dark:hover:text-blue-300 hover:shadow-sm"
    }
    ${isRTL ? "flex-row-reverse justify-end" : "flex-row justify-start"}
  `}
  onClick={() => {
    onSectionChange(id);
    if (isMobile) onCloseSidebar();
  }}
  aria-current={activeSection === id ? "page" : undefined}
>
  {isRTL ? (
    <>
      <span className="whitespace-nowrap ml-3">{label}</span>
      <Icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
    </>
  ) : (
    <>
      <Icon className="h-5 w-5 flex-shrink-0 group-hover:scale-110 transition-transform duration-200" />
      <span className="whitespace-nowrap ml-3">{label}</span>
    </>
  )}
</Button>


                </li>
              ))}
            </ul>
          </nav>

          {/* Pied de page */}
          <div
            className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4 mb-6"
            style={{ marginBottom: "20px" }}
          >
            {isMobile && (
              <Button
                variant="ghost"
                onClick={toggleLanguage}
                className="w-full mb-3 flex items-center gap-3 rounded-md px-3 py-2 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-indigo-700 transition-colors duration-200 justify-start"
              >
                <Globe className="h-5 w-5" />
                <div className="flex items-center justify-between w-full">
                  <span>{t.sidebar.language}</span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={language}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.2 }}
                      className="font-semibold text-sm bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded-md"
                    >
                      {language === "fr" ? "FR" : "AR"}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors duration-200 justify-start"
            >
              <LogOut className="h-5 w-5" />
              <span>{t.sidebar.logout}</span>
            </Button>
          </div>
        </div>
      </motion.aside>

      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onCloseSidebar}
          aria-hidden="true"
        />
      )}
    </>
  );
}
