import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { MainContent } from "@/components/MainContent";
import { LoginForm } from "@/components/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import HomePage from "@/components/HomePage";

// --- ROUTE GUARDS ---

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-4 text-center">Chargement...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div className="p-4 text-center">Chargement...</div>;
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
}

// --- LAYOUT ---

const AppLayout = ({
  children,
  isSidebarOpen,
  toggleSidebar,
  closeSidebar,
  activeSection,
  setActiveSection,
  isMobile,
}: {
  children: React.ReactNode;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isMobile: boolean;
}) => {
  const { language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <div className="flex flex-col min-h-screen h-screen bg-background text-foreground transition-colors duration-300">
      <Header isSidebarOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        onCloseSidebar={closeSidebar}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        isMobile={isMobile}
      />
      <main
        className={`flex-1 overflow-auto pt-[80px] pb-8 transition-all duration-300 ${
          isSidebarOpen && !isMobile
            ? isRTL
              ? "pr-64"
              : "pl-64"
            : ""
        }`}
      >
        {children}
      </main>
    </div>
  );
};

// --- APP PRINCIPAL ---

const App = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <LanguageProvider initialLanguage="fr">
      <BrowserRouter>
        <Routes>
          {/* Page d'accueil publique */}
          <Route path="/" element={<HomePage />} />

          {/* Page de login protégée par PublicRoute */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginForm />
              </PublicRoute>
            }
          />

          {/* Toutes les autres routes privées */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <AppLayout
                  isSidebarOpen={isSidebarOpen}
                  toggleSidebar={toggleSidebar}
                  closeSidebar={closeSidebar}
                  activeSection={activeSection}
                  setActiveSection={setActiveSection}
                  isMobile={isMobile}
                >
                  <MainContent
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                  />
                </AppLayout>
              </PrivateRoute>
            }
          />

          {/* Catch-all : redirection vers l'accueil */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
