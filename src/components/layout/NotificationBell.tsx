import React, { useState } from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotifications } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const handleNotificationClick = (id: string, link?: string) => {
    markAsRead(id);
    // if (link) navigate(link);
  };

  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'grade':
        return '📝';
      case 'absence':
        return '📅';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
<Button
          variant="ghost"
          size="icon"
          className="relative rounded-full hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        >          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

            <DropdownMenuContent className="w-80 md:w-96 shadow-xl border" align="end"> {/* Ajout d'ombre et bordure */}
        <DropdownMenuLabel className="flex justify-between items-center text-sm font-medium p-3">

          <span>Notifications</span>
          {notifications.length > 0 && unreadCount > 0 && ( // Afficher seulement si pertinent
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs text-primary hover:text-primary/90 px-2 py-1 h-auto" // Style plus subtil
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" /> Tout lire
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <DropdownMenuItem disabled className="text-center text-muted-foreground py-4">
            Aucune notification
          </DropdownMenuItem>
        ) : (
          <ScrollArea className="h-[300px]">
            {notifications.map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                onClick={() => handleNotificationClick(notif.id, notif.link)}
                className={cn(
                   'flex flex-col items-start gap-1 p-3 cursor-pointer hover:bg-accent/50 focus:bg-accent/60 rounded-sm', // Effet hover/focus et coins arrondis
                  !notif.read && 'bg-primary/5' // Un fond très léger pour les non-lus, utilisant la couleur primaire
                )}
              >
                <span
                  className={cn(
                    'text-sm flex items-center gap-1.5', // Léger espacement pour l'icône
                    notif.read ? 'text-foreground/70' : 'text-primary font-medium' // Style distinct pour non-lu
                  )} 

                >
                  {renderNotificationIcon(notif.type)}
                  {notif.message}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(notif.date), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={clearNotifications}
              className="text-destructive hover:text-destructive focus:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 justify-center text-sm font-medium p-3 rounded-sm"
            >
              <X className="h-3.5 w-3.5 mr-1.5" /> Vider les notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
