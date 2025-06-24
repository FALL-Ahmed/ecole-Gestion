import React, {
  createContext,
  useContext,
  useState,
  
  useEffect,
  useCallback,
  ReactNode,
} from 'react';

interface Notification {
  id: string;
  message: string;
  type: 'grade' | 'absence' | 'info';
  read: boolean;
  link?: string;
  date: Date;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (message: string, type: Notification['type'], link?: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

const MAX_NOTIFICATIONS = 50;
const STORAGE_KEY_PREFIX = 'app_notifications';
import { useAuth } from '@/contexts/AuthContext'; // Importer useAuth

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth(); // Récupérer l'utilisateur du contexte d'authentification

  // Load from localStorage on mount
  useEffect(() => {
if (!user || !user.id) {
      // Si aucun utilisateur n'est connecté, vider les notifications et ne rien charger
      setNotifications([]);
      // Optionnel: supprimer une clé générique si elle existait avant
      // localStorage.removeItem('app_notifications'); 
      return;
    }

    const userSpecificStorageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
    const stored = localStorage.getItem(userSpecificStorageKey);
    if (stored) {
      try {
        const parsed: Notification[] = JSON.parse(stored);
        // Convert date strings back to Date objects
        const hydrated = parsed.map(n => ({ ...n, date: new Date(n.date) }));
        setNotifications(hydrated);
      } catch (err) {
        console.error('Failed to parse stored notifications', err);
         localStorage.removeItem(userSpecificStorageKey);
        setNotifications([]);
      }
    } else {
      // Aucune notification stockée pour cet utilisateur, s'assurer que l'état est vide
      setNotifications([]);
    }
  }, [user]); // Se déclenche lorsque l'objet utilisateur change (connexion/déconnexion)

  // Save to localStorage on change
  useEffect(() => {
    if (user && user.id) {
      const userSpecificStorageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
      localStorage.setItem(userSpecificStorageKey, JSON.stringify(notifications));
    }
    // Si l'utilisateur est null (déconnecté), on ne sauvegarde rien,
    // et le useEffect de chargement ci-dessus aura déjà vidé l'état des notifications.
  }, [notifications, user]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const addNotification = useCallback(
    (message: string, type: Notification['type'], link?: string) => {
      const newNotification: Notification = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        message,
        type,
        read: false,
        link,
        date: new Date(),
      };

      setNotifications(prev => {
        const updated = [newNotification, ...prev];
        // Limit number of stored notifications
        return updated.slice(0, MAX_NOTIFICATIONS);
      });
    },
    []
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]); // Vider également le localStorage pour l'utilisateur actuel
    if (user && user.id) {
      const userSpecificStorageKey = `${STORAGE_KEY_PREFIX}${user.id}`;
      localStorage.removeItem(userSpecificStorageKey);
    }
   }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
