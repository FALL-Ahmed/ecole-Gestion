import React, { useState } from 'react';
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
import { Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      // Sauvegarde utilisateur
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);

      toast({
        title: "Connexion réussie",
        description: `Bienvenue ${user.email}`,
      });

      // Si l'utilisateur est professeur, on récupère ses affectations
      if (user?.role === 'professeur') {
  try {
    const affectationRes = await fetch(
      `http://localhost:3000/api/affectations?professeurId=${user.id}`
    );
    const affectations = await affectationRes.json();
    console.log('Affectations récupérées :', affectations); // <-- Ajout du console.log ici
    localStorage.setItem('affectations', JSON.stringify(affectations));
  } catch (err) {
    console.error("Erreur lors de la récupération des affectations :", err);
  }
}


      // Redirection (ex: tableau de bord)
      // window.location.href = '/dashboard';
    } catch (error) {
      toast({
        title: "Erreur de connexion",
        description: "Email ou mot de passe incorrect",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Sources des Sciences</h1>
          <p className="text-gray-600">Plateforme de Gestion Scolaire</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Connexion</CardTitle>
            <CardDescription>Accédez à votre espace personnel</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@sources-sciences.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="text-right text-sm">
                <a href="/mot-de-passe-oublie" className="text-blue-500 hover:underline">
                  Mot de passe oublié ?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-500">
              <p>© 2025 Sources des Sciences - Tous droits réservés</p>
              <a href="#" className="text-blue-500 hover:underline mt-1 inline-block">
                Politique de confidentialité
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
