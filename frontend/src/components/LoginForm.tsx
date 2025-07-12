import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, School, BookOpen, GraduationCap, Lock, Mail, Sparkles, Check, Notebook, Users, Award, Calendar } from 'lucide-react';
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const educationalTips = [
  "Madrastak centralise toute la gestion scolaire pour que chaque acteur gagne en efficacité.",
  "Une plateforme unique, pour piloter l'école de demain avec simplicité et précision.",
  "Madrastak connecte professeurs, parents, élèves et administration dans un même élan.",
  "Gérer les absences, notes, emplois du temps... n'a jamais été aussi fluide et sécurisé.",
  "Plus qu'un outil, Madrastak est un partenaire de confiance pour les écoles mauritaniennes.",
  "La digitalisation de l'école, pensée pour tous, accessible à chacun.",
  "Madrastak facilite la communication et renforce la coopération entre tous les acteurs scolaires.",
  "Donnez à votre établissement les moyens de ses ambitions avec une gestion moderne et intégrée.",
  "En un clic, visualisez l'état de votre école, planifiez et optimisez chaque journée.",
  "Madrastak, la plateforme qui fait rimer technologie et humanité au service de l'éducation.",
  "Avec Madrastak, l'école se déplace vers l'élève et les parents, et non l'inverse.",
  "À chaque connexion sur Madrastak, un rêve se rapproche.",
  "Avec Madrastak, la digitalisation de l'école devient accessible, intuitive et complète."
];


const educationalTipsAr = [
  "مدرستك تُركز إدارة المدرسة لتحقيق أقصى قدر من الكفاءة.",
  "منصة موحدة لإدارة مدرسة المستقبل بدقة وسهولة.",
  "مدرستك تربط بين الأساتذة، الأولياء، التلاميذ والإدارة في انسجام تام.",
  "إدارة الغيابات، النتائج، والجداول الزمنية... أصبحت أكثر سلاسة وأماناً.",
  "أكثر من مجرد أداة، مدرستك شريك موثوق للمدارس الموريتانية.",
  "رقمنة المدرسة مصممة للجميع ومتاحة لكل فرد.",
  "مدرستك تسهل التواصل وتعزز التعاون بين جميع الفاعلين التربويين.",
  "وفّر لمؤسستك الوسائل الحديثة لتحقيق طموحاتها بإدارة متكاملة.",
  "بنقرة واحدة، تابع حالة مدرستك، خطط وحقق أفضل استغلال لكل يوم دراسي.",
  "مدرستك، المنصة التي تمزج بين التكنولوجيا والإنسانية لخدمة التعليم.",
  "مع مدرستك، المدرسة تقترب من التلميذ وولي الأمر... وليس العكس.",
  "مع كل دخول إلى مدرستك، يقترب الحلم أكثر.",
  "مع مدرستك، تصبح رقمنة المدرسة شاملة، سهلة، ومتاحة للجميع."
];

const floatingIconsList = [
  { icon: BookOpen, color: "text-blue-400/40" },
  { icon: GraduationCap, color: "text-indigo-400/40" },
  { icon: School, color: "text-purple-400/40" },
  { icon: Notebook, color: "text-green-400/40" },
  { icon: Users, color: "text-yellow-400/40" },
  { icon: Award, color: "text-red-400/40" },
  { icon: Calendar, color: "text-pink-400/40" },
];

export function LoginForm() {
  const { setUser, setToken } = useAuth();
  const { t, language } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { schoolName } = useEstablishmentInfo();
  const [floatingElements, setFloatingElements] = useState<any[]>([]);
  const [currentTip] = useState(
    language === 'ar' 
      ? educationalTipsAr[Math.floor(Math.random() * educationalTipsAr.length)]
      : educationalTips[Math.floor(Math.random() * educationalTips.length)]
  );
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const navigate = useNavigate();

  // Generate floating elements with more variety
  useEffect(() => {
    const elements = [];
    const count = 20; // Increased number of floating elements
    
    for (let i = 0; i < count; i++) {
      const iconType = floatingIconsList[Math.floor(Math.random() * floatingIconsList.length)];
      const Icon = iconType.icon;
      
      elements.push({
        id: i,
        element: <Icon className={`${iconType.color} dark:${iconType.color.replace('/40', '/30')}`} />,
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        size: Math.random() * 24 + 16, // More size variation
        duration: Math.random() * 20 + 25, // Longer duration
        delay: Math.random() * 10,
        rotation: Math.random() * 360,
        pathVariation: Math.random() * 40 - 20
      });
    }
    
    // Add some floating text elements (educational keywords)
    const keywords = language === 'ar' 
      ? ['تعليم', 'معرفة', 'نجاح', 'تميز', 'إبداع', 'تعلم'] 
      : ['Éducation', 'Savoir', 'Réussite', 'Excellence', 'Créativité', 'Apprentissage'];
    
    for (let i = 0; i < 8; i++) {
      elements.push({
        id: count + i,
        element: (
          <span className={`text-xs font-medium ${i % 2 === 0 ? 'text-blue-400/50' : 'text-purple-400/50'} dark:text-opacity-40`}>
            {keywords[Math.floor(Math.random() * keywords.length)]}
          </span>
        ),
        x: Math.random() * 90 + 5,
        y: Math.random() * 90 + 5,
        size: Math.random() * 14 + 10,
        duration: Math.random() * 30 + 40,
        delay: Math.random() * 15,
        rotation: 0,
        pathVariation: Math.random() * 60 - 30
      });
    }
    
    setFloatingElements(elements);
  }, [language]);

  const login = (access_token: string, user: any) => {
    setUser(user);
    setToken(access_token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', access_token);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: t.login.errorDescription }));
        throw new Error(errorData.message || t.login.errorDescription);
      }

      const data = await response.json();
      const { access_token, user } = data;

      // Vérification supplémentaire pour les élèves
      if (user.role === 'eleve') {
        // 1. Récupérer l'année scolaire active depuis la configuration
        const configRes = await fetch(`${API_URL}/api/configuration`);
        if (!configRes.ok) {
          throw new Error(t.login.toast.errorConfig || "Impossible de vérifier la configuration de l'année scolaire.");
        }
        const configData = await configRes.json();
        let activeAnneeId: number | undefined;
        if (Array.isArray(configData) && configData.length > 0) {
          activeAnneeId = configData[0].annee_academique_active_id || configData[0].annee_scolaire?.id;
        } else if (configData && !Array.isArray(configData)) {
          activeAnneeId = configData.annee_academique_active_id || configData.annee_scolaire?.id;
        }

        if (!activeAnneeId) {
          throw new Error(t.login.toast.errorNoActiveYear || "Aucune année scolaire active n'est configurée. Connexion impossible.");
        }

        // 2. Vérifier si l'élève a une inscription active pour cette année
        const inscriptionsRes = await fetch(`${API_URL}/api/inscriptions?utilisateurId=${user.id}&anneeScolaireId=${activeAnneeId}`);
        if (inscriptionsRes.status === 404) { // Pas d'inscription trouvée
          throw new Error(t.login.toast.errorNotEnrolled || "Vous n'êtes pas inscrit pour l'année scolaire en cours. Veuillez contacter l'administration.");
        }
        if (!inscriptionsRes.ok) { // Autre erreur serveur
          throw new Error(t.login.toast.errorEnrollment || "Erreur lors de la vérification de votre inscription.");
        }
        const inscriptions = await inscriptionsRes.json();
        const hasActiveInscription = inscriptions.some((insc: any) => insc.actif);

        if (!hasActiveInscription) {
          throw new Error(t.login.toast.errorNotEnrolled || "Vous n'êtes pas inscrit pour l'année scolaire en cours. Veuillez contacter l'administration.");
        }
      }

      setLoginSuccess(true);

      setTimeout(() => {
        setRedirecting(true);
        
        setTimeout(() => {
          login(access_token, user);
          navigate('/dashboard');
        }, 1500);
      }, 1500);
    } catch (error: any) {
      toast({
        title: t.login.toast.loginFailedTitle || "Échec de la connexion",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 overflow-y-auto bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 ${language === 'ar' ? 'rtl' : 'ltr'} min-h-[100dvh] pb-[env(safe-area-inset-bottom)]`}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {floatingElements.map((item) => (
          <motion.div
            key={item.id}
            initial={{ 
              opacity: 0, 
              y: item.y, 
              x: item.x,
              rotate: item.rotation
            }}
            animate={{
              opacity: [0, 0.4, 0],
              y: [item.y, item.y - 100, item.y - 200],
              x: [
                item.x,
                item.x + item.pathVariation,
                item.x + (item.pathVariation * 1.5)
              ],
              rotate: item.rotation + (item.id % 2 === 0 ? 180 : -180)
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              repeatType: "loop",
              delay: item.delay,
              ease: "linear"
            }}
            className="absolute"
            style={{ 
              left: `${item.x}%`, 
              top: `${item.y}%`,
              fontSize: `${item.size}px`
            }}
          >
            {item.element}
          </motion.div>
        ))}
      </div>

      {/* Success confirmation overlay */}
      <AnimatePresence>
        {loginSuccess && !redirecting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-20 bg-black/30 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.5, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 300 }}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-2xl border border-green-200 dark:border-green-800 flex flex-col items-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <Check className="h-12 w-12 text-green-500 bg-green-100 dark:bg-green-900/20 rounded-full p-2" />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-lg font-bold text-gray-800 dark:text-white mb-2"
              >
                {t.login.successTitle}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-gray-600 dark:text-gray-300 text-sm"
              >
                {t.login.successMessage}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Redirection overlay */}
      <AnimatePresence>
        {redirecting && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm z-30 flex items-center justify-center"
          >
            <div className="text-center space-y-6 max-w-xs">
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="inline-flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-blue-500 dark:text-blue-400"
                >
                  <School className="h-12 w-12" />
                </motion.div>
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-gray-800 dark:text-white"
              >
                {schoolName}
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 dark:text-gray-300"
              >
                {t.login.redirecting}
              </motion.p>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'easeInOut' }}
                className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mx-auto"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

<div className="w-full max-w-md mx-auto relative z-10 py-8 px-4 min-h-full flex flex-col justify-center">
          {/* School Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center space-y-4"
        >
          <motion.div
            initial={{ scale: 0.8, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 10, 
              delay: 0.4 
            }}
            className="bg-white dark:bg-gray-800 p-4 rounded-full shadow-lg border-4 border-blue-100 dark:border-gray-700 inline-flex"
          >
            <School className="h-12 w-12 text-blue-600 dark:text-blue-400" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-2"
          >
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
              {schoolName}
            </h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="text-lg text-blue-600 dark:text-blue-400 font-medium"
            >
              {language === 'ar' ? "نحو مستقبل مشرق بالعلم والمعرفة" : "Inspirer, Éduquer, Transformer"}
            </motion.p>
          </motion.div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
<Card className="w-full border-0 shadow-xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm overflow-hidden">            <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400"></div>
            
            <CardHeader className="pb-4 pt-6">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center space-y-3"
              >
                <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                  {t.login.title}
                </CardTitle>
              </motion.div>
            </CardHeader>
            
<CardContent className="px-4 sm:px-6 pb-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email Field */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-2"
                >
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-medium">
                    {t.login.emailLabel}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.login.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading || loginSuccess}
                      className="pl-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </motion.div>

                {/* Password Field */}
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-2"
                >
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-medium">
                    {t.login.passwordLabel}
                  </Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t.login.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading || loginSuccess}
                      className="pl-10 pr-10 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-all dark:bg-gray-700 dark:text-white"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || loginSuccess}
                      aria-label={showPassword ? t.common.hidePassword : t.common.showPassword}
                    >
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={showPassword ? 'visible' : 'hidden'}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          transition={{ duration: 0.2 }}
                        >
                          {showPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </motion.span>
                      </AnimatePresence>
                    </button>
                  </div>
                </motion.div>

                {/* Forgot Password Link */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className={`text-sm ${language === 'ar' ? 'text-left' : 'text-right'} pt-1`}
                >
                  <a 
                    href="/mot-de-passe-oublie" 
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors font-medium"
                  >
                    {t.login.forgotPassword}
                  </a>
                </motion.div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-500 dark:to-indigo-600 hover:from-blue-700 hover:to-indigo-800 dark:hover:from-blue-600 dark:hover:to-indigo-700 shadow-lg transition-all transform hover:scale-[1.01] active:scale-[0.99] group relative overflow-hidden"
                    disabled={isLoading || loginSuccess}
                  >
                    {isLoading ? (
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="inline-flex items-center"
                      >
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </motion.span>
                    ) : loginSuccess ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 500 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <Check className="h-5 w-5" />
                        <span>{t.login.successButton}</span>
                      </motion.div>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <motion.span 
                          animate={isLoading ? { x: 5 } : { x: 0 }}
                          transition={{ type: 'spring', stiffness: 500 }}
                        >
                          {t.login.button}
                        </motion.span>
                        <motion.span
                          initial={{ x: -5, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                          className="group-hover:translate-x-1 transition-transform"
                        >
                          →
                        </motion.span>
                      </span>
                    )}
                  </Button>
                </motion.div>
              </form>

              {/* Educational Tip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start space-x-3">
                  <Sparkles className="h-5 w-5 text-yellow-500 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {currentTip}
                  </p>
                </div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="mt-6 text-center space-y-2 text-xs"
              >
                <p className="text-gray-500 dark:text-gray-400">
                  {t.login.copyright}
                </p>
                <a 
                  href="#" 
                  className="inline-block text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline transition-colors font-medium"
                >
                  {t.login.privacyPolicy}
                </a>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default LoginForm;