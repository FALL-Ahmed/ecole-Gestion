import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import { translations, TranslationSet } from "@/translations";

// Types
export type LanguageType = "fr" | "ar";

interface LanguageContextType {
  language: LanguageType;
  toggleLanguage: () => void;
  t: TranslationSet;
}

// Création du contexte
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Hook custom
export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

// Provider
interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: LanguageType;
}

export const LanguageProvider = ({
  children,
  initialLanguage = "fr",
}: LanguageProviderProps) => {
  const [language, setLanguage] = useState<LanguageType>(() => {
    const saved = localStorage.getItem("language") as LanguageType | null;
    return saved || initialLanguage;
  });

  useEffect(() => {
    localStorage.setItem("language", language);
    // Appliquer la classe direction RTL si arabe
    if (language === "ar") {
      document.documentElement.dir = "rtl";
    } else {
      document.documentElement.dir = "ltr";
    }
  }, [language]);
  
  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "fr" ? "ar" : "fr"));
  };

  // L'objet de traduction pour la langue actuelle.
  // Utilise le français comme langue de secours si la traduction n'existe pas.
  const t: TranslationSet = useMemo(() => {
    const selectedTranslations = translations[language];
    if (!selectedTranslations) {
      // Affiche une erreur dans la console si la traduction n'est pas trouvée
      console.error(`[LanguageContext] Traductions pour la langue "${language}" introuvables ! Utilisation du français par défaut.`);
      return translations.fr;
    }
    return selectedTranslations;
  }, [language]);

  const value = useMemo(() => ({ language, toggleLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};