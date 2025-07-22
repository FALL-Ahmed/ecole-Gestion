import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useParentChildren } from '@/hooks/useParentChildren';
import { useCurrentAnneeScolaire } from '@/hooks/useCurrentAnneeScolaire';
import api from '@/lib/api';
import { Paiement } from '@/types/paiement';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, Calendar, TrendingDown, PiggyBank } from 'lucide-react';
import { ChildSelector } from './ChildSelector';
import { format } from 'date-fns';
import { fr, ar } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { Progress } from '@/components/ui/progress';
import { Button } from '../ui/button';

const HistoriquePaiements: React.FC = () => {
  const { t, language } = useLanguage();
  const { children, loading: loadingChildren, error: errorChildren } = useParentChildren();
  const { anneeScolaire } = useCurrentAnneeScolaire();

  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  const [paiements, setPaiements] = useState<Paiement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  useEffect(() => {
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (!selectedChild || !anneeScolaire) {
      setPaiements([]);
      setStatusFilter('all');
      return;
    }

    const fetchHistorique = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/paiements/historique/eleve/${selectedChild}`, {
          params: { anneeScolaireId: anneeScolaire.id },
        });
        setPaiements(response.data);
      } catch (err) {
        setError(t.parent.payments.loadError);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistorique();
  }, [selectedChild, anneeScolaire, t]);

  const filteredPaiements = useMemo(() => {
    if (statusFilter === 'all') {
      return paiements;
    }
    return paiements.filter(p => p.statut === statusFilter);
  }, [paiements, statusFilter]);

  const annualTotals = useMemo(() => {
    if (!paiements || paiements.length === 0) {
      return { totalAttendu: 0, totalPaye: 0, totalRestant: 0 };
    }
    const totals = paiements.reduce(
      (acc, p) => {
        acc.totalAttendu += Number(p.montantAttendu);
        acc.totalPaye += Number(p.montantPaye);
        return acc;
      },
      { totalAttendu: 0, totalPaye: 0 }
    );
    return { ...totals, totalRestant: totals.totalAttendu - totals.totalPaye };
  }, [paiements]);

  const getBadgeVariant = (statut: string): "default" | "destructive" | "secondary" | "outline" => {
    switch (statut) {
      case 'Payé': return 'default';
      case 'Partiel': return 'secondary';
      case 'Non Payé': return 'destructive';
      default: return 'outline';
    }
  };

  const translateStatus = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'Payé': t.parent.payments.status.paid,
      'Partiel': t.parent.payments.status.partial,
      'Non Payé': t.parent.payments.status.unpaid,
    };
    return statusMap[status] || status;
  };

  if (loadingChildren) {
    return (
      <div className="flex justify-center items-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">{t.common.loadingData}</p>
      </div>
    );
  }

  if (errorChildren) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t.common.error}</AlertTitle>
        <AlertDescription>{errorChildren}</AlertDescription>
      </Alert>
    );
  }

  if (children.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-2">{t.parent.payments.noChildrenFound}</h2>
        <p>{t.parent.grades.noChildrenDesc}</p>
      </div>
    );
  }

  const renderPaymentHistory = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center p-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-4 text-muted-foreground">{t.common.loading}</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="destructive" className="my-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t.common.error}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }

    if (paiements.length === 0 && !isLoading) {
      return <p className="p-10 text-center text-muted-foreground">{t.parent.payments.noPayments}</p>;
    }

    if (filteredPaiements.length === 0 && !isLoading) {
      return <p className="p-10 text-center text-muted-foreground">{t.parent.payments.noPaymentsForFilter || 'Aucun paiement ne correspond à ce filtre.'}</p>;
    }

    if (isMobile) {
      return (<>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPaiements.map((p) => {
            const resteAPayer = Math.max(0, Number(p.montantAttendu) - Number(p.montantPaye));
            const progress = p.montantAttendu > 0 ? (Number(p.montantPaye) / Number(p.montantAttendu)) * 100 : 0;

            return (
              <Card key={p.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between p-4 bg-muted/30 dark:bg-muted/10">
                  <CardTitle className="text-lg font-bold">{p.mois}</CardTitle>
                  <Badge variant={getBadgeVariant(p.statut)}>{translateStatus(p.statut)}</Badge>
                </CardHeader>
                <CardContent className="p-4 space-y-4 flex-grow flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-baseline mb-1 text-sm">
                      <span className="text-sm text-muted-foreground">{t.parent.payments.table.amountPaid}</span>
                      <span className="font-semibold">{Number(p.montantPaye).toFixed(2)} / {Number(p.montantAttendu).toFixed(2)} {t.common.currency}</span>
                    </div>
                    <Progress value={progress} className={cn(
                      "h-2",
                      progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-300'
                    )} />
                  </div>
                  <div className="space-y-2 border-t pt-4 text-sm">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        <span>{t.parent.payments.table.balance}</span>
                      </div>
                      <span className="font-bold text-destructive">{resteAPayer.toFixed(2)} {t.common.currency}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>{t.parent.payments.table.paymentDate}</span>
                      </div>
                      <span className="font-medium">
                        {p.dateDernierPaiement ? format(new Date(p.dateDernierPaiement), 'd MMM yyyy', { locale: language === 'ar' ? ar : fr }) : t.common.notApplicable}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-primary" />
                <span>{t.parent.payments.annualSummary || 'Résumé Annuel'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.parent.payments.table.amountDue}</span>
                <span className="font-bold font-mono">{annualTotals.totalAttendu.toFixed(2)} {t.common.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.parent.payments.table.amountPaid}</span>
                <span className="font-bold text-green-600 font-mono">{annualTotals.totalPaye.toFixed(2)} {t.common.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t.parent.payments.table.balance}</span>
                <span className="font-bold text-destructive font-mono">{annualTotals.totalRestant.toFixed(2)} {t.common.currency}</span>
              </div>
            </CardContent>
          </Card>
        </>);
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">{t.parent.payments.table.month}</TableHead>
            <TableHead className="w-[180px]">{t.parent.payments.table.progression || 'Progression'}</TableHead>
            <TableHead className="text-right">{t.parent.payments.table.amountDue}</TableHead>
            <TableHead className="text-right">{t.parent.payments.table.amountPaid}</TableHead>
            <TableHead className="text-right">{t.parent.payments.table.balance}</TableHead>
            <TableHead className="text-center">{t.parent.payments.table.status}</TableHead>
            <TableHead>{t.parent.payments.table.paymentDate}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredPaiements.map((p) => {
            const resteAPayer = Math.max(0, Number(p.montantAttendu) - Number(p.montantPaye));
            const progress = p.montantAttendu > 0 ? (Number(p.montantPaye) / Number(p.montantAttendu)) * 100 : 0;
            return (
              <TableRow key={p.id} className="hover:bg-muted/50">
                <TableCell className="font-medium">{p.mois}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Progress value={progress} className={cn(
                      "h-2 w-20",
                      progress >= 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-300'
                    )} />
                    <span className="text-xs text-muted-foreground font-mono">{progress.toFixed(0)}%</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">{Number(p.montantAttendu).toFixed(2)} {t.common.currency}</TableCell>
                <TableCell className="text-right font-mono font-semibold text-green-600">{Number(p.montantPaye).toFixed(2)} {t.common.currency}</TableCell>
                <TableCell className={`text-right font-mono font-bold ${resteAPayer > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {resteAPayer.toFixed(2)} {t.common.currency}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getBadgeVariant(p.statut)}>{translateStatus(p.statut)}</Badge>
                </TableCell>
                <TableCell>
                  {p.dateDernierPaiement
                    ? format(new Date(p.dateDernierPaiement), 'd MMMM yyyy', { locale: language === 'ar' ? ar : fr })
                    : t.common.notApplicable}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
            <TableRow className="bg-muted/50 hover:bg-muted/80">
                <TableCell colSpan={2} className="font-bold text-lg">{t.parent.payments.total || 'Total Annuel'}</TableCell>
                <TableCell className="text-right font-bold text-lg font-mono">{annualTotals.totalAttendu.toFixed(2)} {t.common.currency}</TableCell>
                <TableCell className="text-right font-bold text-lg font-mono text-green-600">{annualTotals.totalPaye.toFixed(2)} {t.common.currency}</TableCell>
                <TableCell className="text-right font-bold text-lg font-mono text-destructive">{annualTotals.totalRestant.toFixed(2)} {t.common.currency}</TableCell>
                <TableCell colSpan={2}></TableCell>
            </TableRow>
        </TableFooter>
      </Table>
    );
  };

  return (
    <div className={cn("p-4 md:p-6", language === 'ar' ? 'rtl' : 'ltr')}>
      <div className={cn("flex justify-between items-center mb-6", language === 'ar' ? 'text-right' : 'text-left')}>
        <div>
          <h1 className="text-2xl font-bold">{t.parent.payments.title}</h1>
          <p className="text-muted-foreground">{t.parent.payments.description}</p>
        </div>
      </div>

      <ChildSelector children={children} selectedChild={selectedChild} onChildChange={setSelectedChild} />

      {selectedChild && (
        <>
          <div className="flex items-center gap-2 my-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground mr-2">{t.common.filterBy || 'Filtrer par'}:</span>
            <Button size="sm" variant={statusFilter === 'all' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('all')}>
              {t.common.all || 'Tous'}
            </Button>
            <Button size="sm" variant={statusFilter === 'Non Payé' ? 'destructive' : 'ghost'} onClick={() => setStatusFilter('Non Payé')}>
              {t.parent.payments.status.unpaid}
            </Button>
            <Button size="sm" variant={statusFilter === 'Partiel' ? 'secondary' : 'ghost'} onClick={() => setStatusFilter('Partiel')}>
              {t.parent.payments.status.partial}
            </Button>
            <Button size="sm" variant={statusFilter === 'Payé' ? 'default' : 'ghost'} className={statusFilter === 'Payé' ? 'bg-green-600 hover:bg-green-700' : ''} onClick={() => setStatusFilter('Payé')}>
              {t.parent.payments.status.paid}
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t.parent.payments.historyFor} {children.find(c => c.id === selectedChild)?.prenom}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderPaymentHistory()}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default HistoriquePaiements;
