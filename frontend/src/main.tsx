import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { EstablishmentInfoProvider } from './contexts/EstablishmentInfoContext';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <EstablishmentInfoProvider>
          <NotificationProvider>
            <App />
            <Toaster />
            <Sonner />
          </NotificationProvider>
        </EstablishmentInfoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);