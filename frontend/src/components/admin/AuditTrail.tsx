import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { History, Search, User, Calendar as CalendarIcon, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format, subDays, isWithinInterval } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Separator } from '@radix-ui/react-dropdown-menu';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

interface AuditLog {
  id: number;
  timestamp: string;
  utilisateur: { id: number; nom: string; prenom: string };
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entite: string;
  entite_id: number;
  description: string;
  details?: any;
}

export function AuditTrail() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const dateLocale = language === 'ar' ? ar : fr;
  const textDirection = isRTL ? 'rtl' : 'ltr';
  const flexDirection = isRTL ? 'flex-row-reverse' : 'flex-row';

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    user: 'all',
    action: 'all',
    entity: 'all',
    dateRange: {
      from: (() => {
        const date = subDays(new Date(), 7);
        date.setHours(0, 0, 0, 0);
        return date;
      })(),
      to: (() => {
        const date = new Date();
        date.setHours(23, 59, 59, 999);
        return date;
      })()
    }
  });
  const [showFilters, setShowFilters] = useState(false);

  const actionColors = {
    CREATE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    UPDATE: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  

  const actionTranslations = {
    CREATE: t.common.add,
    UPDATE: t.common.edit,
    DELETE: t.common.delete,
  };

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/historique`);
        if (!response.ok) throw new Error(t.settings.errorFetchingAuditLogs);
        const data = await response.json();
        setLogs(data);
      } catch (error) {
        toast({
          title: t.common.error,
          description: (error as Error).message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, [t]);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const searchMatch = filters.search === '' ||
        log.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        `${log.utilisateur.prenom} ${log.utilisateur.nom}`.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.entite.toLowerCase().includes(filters.search.toLowerCase());

      const userMatch = filters.user === 'all' || String(log.utilisateur.id) === filters.user;
      const actionMatch = filters.action === 'all' || log.action === filters.action;
      const entityMatch = filters.entity === 'all' || log.entite === filters.entity;
      
      const logDate = new Date(log.timestamp);
      const startDate = new Date(filters.dateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(filters.dateRange.to);
      endDate.setHours(23, 59, 59, 999);

      const dateMatch = logDate >= startDate && logDate <= endDate;

      return searchMatch && userMatch && actionMatch && entityMatch && dateMatch;
    });
  }, [logs, filters]);

  const uniqueUsers = useMemo(() => {
    const users = new Map<number, { id: number; nom: string; prenom: string }>();
    logs.forEach(log => users.set(log.utilisateur.id, log.utilisateur));
    return Array.from(users.values());
  }, [logs]);

  const uniqueEntities = useMemo(() => [...new Set(logs.map(log => log.entite))], [logs]);

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd MMM yyyy HH:mm', { locale: dateLocale });
  };

  const renderDetails = (log: AuditLog) => {
    if (!log.details) return <p className="text-muted-foreground">{t.common.noDetailsAvailable}</p>;

    const renderDiff = (obj: any) => {
      if (!obj) return null;
      
      return (
        <div className="space-y-2">
          {Object.entries(obj).map(([key, value]) => (
            <div key={key} className="grid grid-cols-3 gap-2">
              <span className="font-medium text-right">{key}:</span>
              <span className="col-span-2">
                {typeof value === 'object' ? JSON.stringify(value) : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    };

    return (
      <div className="space-y-4">
        {log.action === 'UPDATE' && (
          <>
            <div className="space-y-2">
              <h4 className="font-medium">{t.audit.changes}</h4>
              {renderDiff(log.details.changes)}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium">{t.audit.before}</h4>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                  {renderDiff(log.details.before)}
                </div>
              </div>
              <div>
                <h4 className="font-medium">{t.audit.after}</h4>
                <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
                  {renderDiff(log.details.after)}
                </div>
              </div>
            </div>
          </>
        )}
        {(log.action === 'CREATE' || log.action === 'DELETE') && (
          <div>
            <h4 className="font-medium">{t.audit.details}</h4>
            <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-xs">
              {renderDiff(log.details)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Mobile card view for audit logs
  const renderMobileLogCard = (log: AuditLog) => (
    <Card key={log.id} className="mb-4 shadow-sm">
      <CardHeader className="pb-3">
        <div className={`flex ${flexDirection} justify-between items-start`}>
          <div>
            <CardTitle className="text-base">
              {log.utilisateur.prenom} {log.utilisateur.nom}
            </CardTitle>
            <CardDescription className="mt-1">
              {formatDate(log.timestamp)}
            </CardDescription>
          </div>
          <Badge className={`${actionColors[log.action]} ${isRTL ? 'ml-2' : 'mr-2'}`}>
            {actionTranslations[log.action]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={`flex ${flexDirection} justify-between`}>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.common.entity}:
            </span>
            <span className="text-sm">
              {log.entite} (ID: {log.entite_id})
            </span>
          </div>
          <div className={`flex ${flexDirection} justify-between`}>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.common.description}:
            </span>
            <span className="text-sm text-right">
              {log.description}
            </span>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full mt-3">
              {t.common.view}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw]" dir={textDirection}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
               
                <span>{t.audit.actionDetails}</span>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">{t.common.user}</h4>
                  <p>{log.utilisateur.prenom} {log.utilisateur.nom}</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t.common.entity}</h4>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">{t.common.date}</h4>
                  <p>{format(new Date(log.timestamp), 'PPPPpp', { locale: dateLocale })}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium">{t.common.description}</h4>
                <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  {log.description}
                </p>
              </div>
              
              <Separator />
              
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-4 md:p-6" dir={textDirection}>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <History className="h-6 w-6 text-primary" />
        {t.audit.title}
      </h1>

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col space-y-1.5">
            <CardTitle className={`flex ${flexDirection} justify-between items-center`}>
              <div className={`flex ${flexDirection} items-center gap-2`}>
                <span className="text-primary">{t.audit.auditLog}</span>
                <Badge variant="outline" className="px-2 py-1">
                  {filteredLogs.length} {t.common.entries}
                </Badge>
              </div>
              <Button
  variant="outline"
  size="sm"
  className={`flex ${flexDirection} items-center gap-2 text-sm sm:text-base`} // Ajout de text-sm pour mobile
  onClick={() => setShowFilters(!showFilters)}
>
  <Filter className="h-4 w-4" />
  <span className="hidden sm:inline"> {/* Masquer le texte sur mobile */}
    {showFilters ? t.common.hideFilters : t.common.showFilters}
  </span>
  {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
</Button>
            </CardTitle>
            <CardDescription>{t.audit.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {showFilters && (
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
              <Input
                placeholder={t.common.search}
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="lg:col-span-2"
                dir={textDirection}
              />
              <Select 
                value={filters.user} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, user: value }))}
                dir={textDirection}
              >
                <SelectTrigger dir={textDirection}>
                  <SelectValue placeholder={t.audit.filterByUser} />
                </SelectTrigger>
                <SelectContent dir={textDirection}>
                  <SelectItem value="all">{t.common.allUsers}</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.prenom} {user.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select 
                value={filters.action} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
                dir={textDirection}
              >
                <SelectTrigger dir={textDirection}>
                  <SelectValue placeholder={t.audit.filterByAction} />
                </SelectTrigger>
                <SelectContent dir={textDirection}>
                  <SelectItem value="all">{t.common.allActions}</SelectItem>
                  <SelectItem value="CREATE">{t.common.add}</SelectItem>
                  <SelectItem value="UPDATE">{t.common.edit}</SelectItem>
                  <SelectItem value="DELETE">{t.common.delete}</SelectItem>
                </SelectContent>
              </Select>
              <Select 
                value={filters.entity} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, entity: value }))}
                dir={textDirection}
              >
                <SelectTrigger dir={textDirection}>
                  <SelectValue placeholder={t.audit.filterByEntity} />
                </SelectTrigger>
                <SelectContent dir={textDirection}>
                  <SelectItem value="all">{t.common.allEntities}</SelectItem>
                  {uniqueEntities.map(entity => (
                    <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`justify-start text-left font-normal ${!filters.dateRange.from && 'text-muted-foreground'}`}
                    >
                      <CalendarIcon className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                      {filters.dateRange.from ? format(filters.dateRange.from, 'PPP', { locale: dateLocale }) : t.common.from}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.from}
                      onSelect={(date) => {
                        if (date) {
                          const newDate = new Date(date);
                          newDate.setHours(0, 0, 0, 0);
                          setFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, from: newDate }
                          }));
                        }
                      }}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`justify-start text-left font-normal ${!filters.dateRange.to && 'text-muted-foreground'}`}
                    >
                      <CalendarIcon className={`${isRTL ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                      {filters.dateRange.to ? format(filters.dateRange.to, 'PPP', { locale: dateLocale }) : t.common.to}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align={isRTL ? 'end' : 'start'}>
                    <Calendar
                      mode="single"
                      selected={filters.dateRange.to}
                      onSelect={(date) => {
                        if (date) {
                          const newDate = new Date(date);
                          newDate.setHours(23, 59, 59, 999);
                          setFilters(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, to: newDate }
                          }));
                        }
                      }}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          {/* Mobile View */}
          <div className="lg:hidden space-y-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                <p className="mt-2">{t.common.loading}</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Search className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="mt-2">{t.common.noDataAvailable}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {t.audit.noResultsHint}
                </p>
              </div>
            ) : (
              filteredLogs.map(renderMobileLogCard)
            )}
          </div>

          {/* Desktop View */}
          <div className="hidden lg:block rounded-md border shadow-sm">
            <Table>
              <TableHeader className={`bg-gray-50 dark:bg-gray-800 ${isRTL ? 'rtl' : 'ltr'}`}>
                <TableRow>
                  <TableHead className={`w-[150px] ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t.common.date}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {t.common.user}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {t.common.action}
                  </TableHead>
                  <TableHead className={isRTL ? 'text-right' : 'text-left'}>
                    {t.common.description}
                  </TableHead>
                  <TableHead className={`w-[100px] ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t.common.details}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        <p>{t.common.loading}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Search className="h-8 w-8 text-muted-foreground" />
                        <p>{t.common.noDataAvailable}</p>
                        <p className="text-sm text-muted-foreground">
                          {t.audit.noResultsHint}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span className="text-sm">{formatDate(log.timestamp)}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), 'PPPP', { locale: dateLocale })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex ${flexDirection} items-center gap-2`}>
                          <span className="font-medium">
                            {log.utilisateur.prenom} {log.utilisateur.nom}
                          </span>
                          
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`flex ${flexDirection} items-center gap-2`}>
                          <Badge className={actionColors[log.action]}>
                            {actionTranslations[log.action]}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {log.description}
                      </TableCell>
                      <TableCell className={isRTL ? 'text-left' : 'text-right'}>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 px-2">
                              {t.common.view}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl" dir={textDirection}>
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                
                                <span>{t.audit.actionDetails}</span>
                              </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-medium">{t.common.user}</h4>
                                  <p>{log.utilisateur.prenom} {log.utilisateur.nom}</p>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-medium">{t.common.entity}</h4>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-medium">{t.common.date}</h4>
                                  <p>{format(new Date(log.timestamp), 'PPPPpp', { locale: dateLocale })}</p>
                                </div>
                              </div>
                              
                              <Separator />
                              
                              <div className="space-y-2">
                                <h4 className="font-medium">{t.common.description}</h4>
                                <p className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                                  {log.description}
                                </p>
                              </div>
                              
                              <Separator />
                              
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}