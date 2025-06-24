import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom"; // Ajout de useLocation
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext"; // NotificationBell sera importé dans MainContent
import { EstablishmentInfoProvider } from './contexts/EstablishmentInfoContext'; // <-- Nouvelle importation
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();


  return (
    <div className="flex flex-col min-h-screen bg-muted/10 relative">
      <main className="flex-1">{children}</main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EstablishmentInfoProvider> {/* Le Provider englobe maintenant tout ce qui en a besoin */}
          <NotificationProvider>
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
            <Toaster />
            <Sonner />
          </NotificationProvider>
        </EstablishmentInfoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
