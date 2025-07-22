import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

interface Child {
  id: number;
  prenom: string;
  nom: string;
  classe: {
    id: number;
    nom: string;
  };
  photoUrl?: string; // Champ optionnel pour la photo
}

interface ChildSelectorProps {
  children: Child[];
  selectedChild: number | null;
  onChildChange: (childId: number) => void;
}

// --- Composants Avatar ---
// Dans une vraie application, ils seraient dans leur propre fichier ui/avatar.tsx
const Avatar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}>
    {children}
  </div>
);

const AvatarImage: React.FC<{ src?: string; alt: string; className?: string }> = ({ src, alt, className }) => (
  <img src={src} alt={alt} className={cn("aspect-square h-full w-full", className)} />
);

const AvatarFallback: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}>
    {children}
  </span>
);
// --- Fin des composants Avatar ---

export function ChildSelector({ children, selectedChild, onChildChange }: ChildSelectorProps) {
  const { t, language } = useLanguage();

  const selectedChildDetails = children.find(c => c.id === selectedChild);

  const getInitials = (firstName: string, lastName: string) => {
    const firstInitial = firstName ? firstName[0] : '';
    const lastInitial = lastName ? lastName[0] : '';
    // Pour l'arabe: Prénom Nom (PN). Pour le français: Nom Prénom (NP).
    return language === 'ar'
      ? `${firstInitial}${lastInitial}`.toUpperCase()
      : `${lastInitial}${firstInitial}`.toUpperCase();
  };

  const renderContent = () => {
    // Cas 1: Un seul enfant, on affiche juste l'info
    if (children.length === 1 && selectedChildDetails) {
      return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
          <Avatar>
            {selectedChildDetails.photoUrl ? (
              <AvatarImage src={selectedChildDetails.photoUrl} alt={language === 'ar' ? `${selectedChildDetails.prenom} ${selectedChildDetails.nom}` : `${selectedChildDetails.nom} ${selectedChildDetails.prenom}`} />
            ) : (
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {getInitials(selectedChildDetails.prenom, selectedChildDetails.nom)}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <p className="font-bold text-base">
              {language === 'ar'
                ? `${selectedChildDetails.prenom} ${selectedChildDetails.nom}`
                : `${selectedChildDetails.nom} ${selectedChildDetails.prenom}`}
            </p>
            <p className="text-sm text-muted-foreground">{t.common.class}: {selectedChildDetails.classe.nom}</p>
          </div>
        </div>
      );
    }

    // Cas 2: 2 ou 3 enfants, on utilise des onglets
    if (children.length > 1 && children.length <= 3) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="tablist" aria-orientation="horizontal">
          {children.map(child => (
            <button
              key={child.id}
              role="tab"
              aria-selected={selectedChild === child.id}
              onClick={() => onChildChange(child.id)}
              className={cn(
                "p-3 rounded-lg text-left transition-all duration-200 flex items-center gap-4 w-full relative focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                selectedChild !== child.id && "hover:bg-muted/80"
              )}
            >
              {selectedChild === child.id && (
                <motion.div
                  layoutId="selected-child-indicator"
                  className="absolute inset-0 bg-primary/10 rounded-lg border-2 border-primary"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Avatar className="relative">
                {child.photoUrl ? (
                  <AvatarImage src={child.photoUrl} alt={language === 'ar' ? `${child.prenom} ${child.nom}` : `${child.nom} ${child.prenom}`} />
                ) : (
                  <AvatarFallback className={cn("font-bold", selectedChild === child.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
                    {getInitials(child.prenom, child.nom)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <p className="font-bold text-base">
                  {language === 'ar' ? `${child.prenom} ${child.nom}` : `${child.nom} ${child.prenom}`}
                </p>
                <p className="text-sm text-muted-foreground">{t.common.class}: {child.classe.nom}</p>
              </div>
            </button>
          ))}
        </div>
      );
    }

    // Cas 3: Plus de 3 enfants, on garde la liste déroulante
    return (
      <Select
        value={selectedChild ? String(selectedChild) : ''}
        onValueChange={(value) => onChildChange(Number(value))}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <SelectTrigger className="w-full md:w-1/2 h-16 text-left">
          <SelectValue asChild>
            {selectedChildDetails ? (
              <div className="flex items-center gap-3">
                <Avatar>
                  {selectedChildDetails.photoUrl ? (
                    <AvatarImage src={selectedChildDetails.photoUrl} alt={language === 'ar' ? `${selectedChildDetails.prenom} ${selectedChildDetails.nom}` : `${selectedChildDetails.nom} ${selectedChildDetails.prenom}`} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {getInitials(selectedChildDetails.prenom, selectedChildDetails.nom)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-bold text-base">
                    {language === 'ar'
                      ? `${selectedChildDetails.prenom} ${selectedChildDetails.nom}`
                      : `${selectedChildDetails.nom} ${selectedChildDetails.prenom}`}
                  </p>
                  <p className="text-sm text-muted-foreground">{t.common.class}: {selectedChildDetails.classe.nom}</p>
                </div>
              </div>
            ) : (
              <span>{t.parent.grades.selectChild}</span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {children.map(child => (
            <SelectItem key={child.id} value={String(child.id)}>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {child.photoUrl ? (
                    <AvatarImage src={child.photoUrl} alt={language === 'ar' ? `${child.prenom} ${child.nom}` : `${child.nom} ${child.prenom}`} />
                  ) : (
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {getInitials(child.prenom, child.nom)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-medium">
                    {language === 'ar' ? `${child.prenom} ${child.nom}` : `${child.nom} ${child.prenom}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.common.class}: {child.classe.nom}</p>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  };

  return (
    <Card className="mb-6 shadow-sm border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className={cn("pb-4", language === 'ar' ? 'text-right' : 'text-left')}>
        <CardTitle>{t.parent.grades.childSelection}</CardTitle>
        <CardDescription>{t.parent.grades.childSelectionDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          <motion.div key={children.length}>{renderContent()}</motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
