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
import AdminLayout from "./components/admin/superadmin/AdminLayout";

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

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  if (isLoading) {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  if (!isAuthenticated || user?.role !== 'superadmin') {
    // Si l'utilisateur est authentifié mais n'est pas un superadmin, on le déconnecte pour éviter la boucle de redirection.
    // Cela le force à arriver sur la page de login dans un état propre et non authentifié.
    if (isAuthenticated) logout();
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
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
  const [portalType, setPortalType] = useState<'school' | 'admin' | 'loading'>('loading');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // 1. Essayer de récupérer le type de portail depuis le localStorage
    const storedPortalType = localStorage.getItem('portalType') as 'school' | 'admin' | null;

    if (storedPortalType) {
      setPortalType(storedPortalType);
    } else {
      // 2. Sinon, le déterminer depuis l'URL (pour le premier accès)
      const hostname = window.location.hostname;
      const urlParams = new URLSearchParams(window.location.search);
      if (hostname.startsWith('admin.') || urlParams.get('portal') === 'admin') {
        setPortalType('admin');
        localStorage.setItem('portalType', 'admin'); // 3. Sauvegarder le choix
      } else {
        setPortalType('school');
        localStorage.setItem('portalType', 'school'); // 3. Sauvegarder le choix
      }
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  if (portalType === 'loading') {
    return <div className="p-4 text-center">Chargement...</div>;
  }

  return (
    <LanguageProvider initialLanguage="fr">
      <BrowserRouter>
        {portalType === 'admin' ? (
          // --- ADMIN PORTAL ROUTES ---
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginForm /></PublicRoute>} />
            <Route path="/*" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            } />
          </Routes>
        ) : (
          // --- SCHOOL PORTAL ROUTES ---
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              }
            />
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
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </BrowserRouter>
    </LanguageProvider>
  );
};

export default App;
