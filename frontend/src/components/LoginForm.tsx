// src/components/LoginForm.tsx
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, School, BookOpen, GraduationCap } from 'lucide-react';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { motion, AnimatePresence } from 'framer-motion';

export function LoginForm() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { schoolName } = useEstablishmentInfo();
  const [floatingIcons, setFloatingIcons] = useState<Array<{id: number, icon: React.ReactNode, x: number, y: number}>>([]);

  // Generate floating icons
  useEffect(() => {
    const icons = [
      <BookOpen className="text-blue-300/40" size={24} key="book" />,
      <GraduationCap className="text-indigo-300/40" size={24} key="cap" />,
      <School className="text-purple-300/40" size={24} key="school" />
    ];
    
    const newIcons = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      icon: icons[i % icons.length],
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10
    }));
    
    setFloatingIcons(newIcons);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Email ou mot de passe incorrect');
      }

      const data = await response.json();
      const user = data.user;

      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${user.prenom} ${user.nom}`,
      });

      if (user?.role === 'professeur') {
        try {
          const professorId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
          if (isNaN(professorId)) {
            console.error("Invalid professor ID:", user.id);
            throw new Error("Identifiant de professeur invalide.");
          }

          const affectationRes = await fetch(
            `http://localhost:3000/api/affectations?professeurId=${professorId}`
          );

          if (!affectationRes.ok) {
            throw new Error(`Failed to fetch affectations: ${affectationRes.statusText}`);
          }

          const affectations = await affectationRes.json();
          localStorage.setItem('affectations', JSON.stringify(affectations));
        } catch (err) {
          console.error("Erreur lors de la récupération des affectations :", err);
          toast({
            title: "Attention !",
            description: "Impossible de charger les affectations du professeur. Réessayez plus tard.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Une erreur inconnue est survenue.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 relative overflow-hidden">
      {/* Floating background icons */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingIcons.map((icon) => (
          <motion.div
            key={icon.id}
            initial={{ opacity: 0, y: 0 }}
            animate={{ 
              opacity: [0, 0.4, 0],
              y: [0, -50, -100],
              x: [icon.x, icon.x + (Math.random() * 20 - 10), icon.x + (Math.random() * 20 - 10)]
            }}
            transition={{
              duration: 15 + Math.random() * 10,
              repeat: Infinity,
              repeatType: "loop",
              delay: Math.random() * 5
            }}
            className="absolute"
            style={{ left: `${icon.x}%`, top: `${icon.y}%` }}
          >
            {icon.icon}
          </motion.div>
        ))}
      </div>

      <div className="w-full max-w-md relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 p-6 rounded-lg bg-white/30 backdrop-blur-sm border border-white/20 shadow-lg"
        >
          <div className="flex items-center justify-center mb-3">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 10 }}
            >
              <School className="h-12 w-12 text-blue-700 mr-3" />
            </motion.div>
            <h1 className="text-4xl font-extrabold text-blue-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
              {schoolName}
            </h1>
          </div>
          <p className="text-lg text-gray-700 font-medium">Plateforme de Gestion Scolaire</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="shadow-xl border border-white/20 bg-white/70 backdrop-blur-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <CardHeader className="text-center pb-2">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700">
                  Connexion
                </CardTitle>
              </motion.div>
              <CardDescription className="text-gray-600">
                Accédez à votre espace personnel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre.email@sources-sciences.fr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-gray-700 font-medium">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Votre mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={showPassword ? 'visible' : 'hidden'}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.5 }}
                          transition={{ duration: 0.2 }}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-right text-sm"
                >
                  <a 
                    href="/mot-de-passe-oublie" 
                    className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                  >
                    Mot de passe oublié ?
                  </a>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-md transition-all transform hover:scale-[1.01] active:scale-[0.99]"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-block"
                      >
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </motion.span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span 
                          animate={isLoading ? { x: 5 } : { x: 0 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        >
                          Se connecter
                        </motion.span>
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-6 text-center text-xs text-gray-500"
              >
                <p>© 2025 Sources des Sciences - Tous droits réservés</p>
                <a 
                  href="#" 
                  className="text-blue-600 hover:text-blue-800 hover:underline transition-colors mt-1 inline-block"
                >
                  Politique de confidentialité
                </a>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}