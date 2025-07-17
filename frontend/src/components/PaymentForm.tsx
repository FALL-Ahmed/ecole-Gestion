import { useState, useEffect } from 'react';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, AlertCircle, User, Calendar, ChevronDown, CreditCard, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface PaymentFormProps {
  payment: any;
  students: any[];
  months: { key: string; display: string }[];
  onSave: (data: any, action: 'create' | 'update') => Promise<void> | void;
  onCancel: () => void;
  translations: any;
  fraisScolariteClasse?: number;
  isLoading?: boolean;
}

export function PaymentForm({
  payment,
  students,
  months,
  onSave,
  onCancel,
  translations,
  fraisScolariteClasse,
  isLoading = false,
}: PaymentFormProps) {
  const [formData, setFormData] = useState(
    payment || {
      eleveId: '',
      mois: '',
      montantAttendu: fraisScolariteClasse || 0,
      montantPaye: 0,
      statut: 'Non Payé',
    }
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialData = {
      ...(payment || {
        eleveId: '',
        mois: '',
        montantAttendu: fraisScolariteClasse || 0,
        montantPaye: 0,
        statut: 'Non Payé',
      }),
      montantAttendu: fraisScolariteClasse !== undefined ? fraisScolariteClasse : payment?.montantAttendu || 0,
    };
    setFormData(initialData);
  }, [payment, fraisScolariteClasse]);

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validation améliorée
  if (formData.montantPaye <= 0) {
    setError(translations.amountError || 'Le montant payé doit être supérieur à zéro');
    return;
  }

  // Nouvelle validation pour le montant maximum
  if (formData.montantPaye > formData.montantAttendu) {
    setError(translations.overpaymentError || 'Le montant payé ne peut pas dépasser le montant attendu');
    return;
  }

  setError(null);
  setIsSubmitting(true);

  try {
    const action = payment?.id ? 'update' : 'create';
    await onSave(formData, action);
  } catch (err) {
    setError(translations.saveError || 'Une erreur est survenue lors de la sauvegarde');
  } finally {
    setIsSubmitting(false);
  }
};

  // Calculate payment status automatically
  useEffect(() => {
    if (formData.montantAttendu) {
      const status =
        formData.montantPaye >= formData.montantAttendu ? 'Payé' :
        formData.montantPaye > 0 ? 'Partiel' : 'Non Payé';
      setFormData(prev => ({ ...prev, statut: status }));
    }
  }, [formData.montantAttendu, formData.montantPaye]);

  // Calculate progress percentage
  const progressPercentage = formData.montantAttendu
    ? Math.min(100, (formData.montantPaye / formData.montantAttendu) * 100)
    : 0;

  // Calculate remaining amount
  const remainingAmount = Math.max(0, formData.montantAttendu - formData.montantPaye);

  // Handle full payment button click
  const handleFullPayment = () => {
    setFormData(prev => ({
      ...prev,
      montantPaye: prev.montantAttendu
    }));
  };

  return (
    <TooltipProvider>
      <DialogHeader className="mb-4">
        <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
          {payment?.id ? (
            <span>{translations.editPayment}</span>
          ) : (
            <span>{translations.addPayment}</span>
          )}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {payment?.id
            ? translations.editPaymentDescription
            : translations.addPaymentDescription}
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6">
          {/* Student Information Card */}
          <Card className="border shadow-sm bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <span>{translations.studentInformation}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {payment?.eleve ? (
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-muted-foreground">
                      {translations.student}
                    </Label>
                    <div className="px-4 py-3 border rounded-lg bg-muted/5 dark:bg-muted/20 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{payment.eleve.prenom} {payment.eleve.nom}</p>
                        <p className="text-sm text-muted-foreground">
  {translations.class}: {payment.eleve.classe?.nom || payment.classe?.nom || 'N/A'}
                        </p>
                      </div>
                      <Badge
                        variant={
                          formData.statut === 'Payé' ? 'default' :
                          formData.statut === 'Partiel' ? 'outline' : 'destructive'
                        }
                        className={cn(
                          "ml-2",
                          formData.statut === 'Payé' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          formData.statut === 'Partiel' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''
                        )}
                      >
                        {formData.statut === 'Payé' ? translations.paid :
                         formData.statut === 'Partiel' ? translations.partial : translations.unpaid}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-sm font-medium">
                      <User className="w-4 h-4 text-primary" />
                      <span>{translations.student}</span>
                    </Label>
                    <Select
                      value={formData.eleveId}
                      onValueChange={value => setFormData({ ...formData, eleveId: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={translations.selectStudent} />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {students.map(student => (
                          <SelectItem
                            key={student.id}
                            value={String(student.id)}
                            className="hover:bg-muted/50"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{student.prenom} {student.nom}</span>
                                <span className="text-xs text-muted-foreground">
                                  {student.classe?.nom || 'N/A'} • ID: {student.id}
                                </span>
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payment Details Card - Mise en page améliorée */}
          <Card className="border shadow-sm bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <CreditCard className="w-5 h-5 text-primary" />
                <span>{translations.paymentDetails}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Month Selection */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <span>{translations.month}</span>
                </Label>
                {payment?.mois ? (
                  <div className="px-4 py-3 border rounded-lg bg-muted/5 dark:bg-muted/20 flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">
                      {months.find(m => m.key === payment.mois)?.display || payment.mois}
                    </span>
                  </div>
                ) : (
                  <Select
                    value={formData.mois}
                    onValueChange={value => setFormData({ ...formData, mois: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={translations.selectMonth} />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(month => (
                        <SelectItem
                          key={month.key}
                          value={month.key}
                          className="hover:bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{month.display}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Amount Due */}
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Label className="flex items-center gap-2 text-sm font-medium cursor-help">
                      <span>{translations.amountDue}</span>
                      <Info className="w-3 h-3 text-muted-foreground" />
                    </Label>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{translations.amountDueTooltip || 'Le tarif mensuel pour la classe de l\'élève.'}</p>
                  </TooltipContent>
                </Tooltip>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                    <span>MRU</span>
                  </div>
                  <Input
                    readOnly
                    type="number"
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    value={formData.montantAttendu}
                    className="bg-muted/10 cursor-not-allowed text-right font-medium text-lg pl-12"
                    disabled={isSubmitting}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {translations.amountDueDescription}
                </p>
              </div>

              {/* Amount Paid with Full Payment Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label className="flex items-center gap-2 text-sm font-medium cursor-help">
                        <span>{translations.amountPaid}</span>
                        <Info className="w-3 h-3 text-muted-foreground" />
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{translations.amountPaidInfoTooltip || 'Le montant actuel versé par l\'élève pour ce mois.'}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleFullPayment}
                    className="text-xs h-7"
                  >
                    {translations.payFullAmount || 'Payer en totalité'}
                  </Button>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-muted-foreground">
                    <span>MRU</span>
                  </div>
<Input
  type="number"
  placeholder="0.00"
  min={0}
  max={formData.montantAttendu} // Limite maximale
  step={0.01}
  value={formData.montantPaye}
  onChange={e => {
    const value = parseFloat(e.target.value) || 0;
    if (value > formData.montantAttendu) {
      // Ne pas mettre à jour si la valeur dépasse le montant attendu
      return;
    }
    setFormData({ ...formData, montantPaye: value });
  }}
  className="text-right font-medium text-lg pl-12"
  disabled={isSubmitting}
  required
/>
                </div>
                {formData.montantPaye > formData.montantAttendu && (
                  <p className="text-xs text-amber-600">
                    {translations.overpaymentNotice}
                  </p>
                )}
              </div>

              {/* Enhanced Payment Summary */}
              <div className="border-t pt-4 mt-4 space-y-4 bg-muted/10 rounded-lg p-4">
                <h3 className="font-medium text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-primary" />
                  <span>{translations.paymentSummary}</span>
                </h3>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {translations.paymentStatus}
                  </span>
                  <Badge
                    variant={
                      formData.statut === 'Payé' ? 'default' :
                      formData.statut === 'Partiel' ? 'outline' : 'destructive'
                    }
                    className={cn(
                      "px-3 py-1 text-sm",
                      formData.statut === 'Payé' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      formData.statut === 'Partiel' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' : ''
                    )}
                  >
                    {formData.statut === 'Payé' ? translations.paid :
                     formData.statut === 'Partiel' ? translations.partial : translations.unpaid}
                  </Badge>
                </div>

                {/* Enhanced Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{translations.progress}</span>
                    <span className="font-medium">
                      {progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress
                    value={progressPercentage}
                    className={cn(
                      "h-2.5",
                      progressPercentage >= 100 ? 'bg-green-500' :
                      progressPercentage > 0 ? 'bg-amber-500' : 'bg-gray-300'
                    )}
                  />
                </div>

                {/* Amount Breakdown */}
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-green-50 dark:bg-green-900/30 p-2 rounded text-center">
                        <p className="font-medium text-green-600 dark:text-green-400">
                          {formData.montantPaye} MRU
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {translations.paid}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {translations.paidAmountTooltip}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-amber-50 dark:bg-amber-900/30 p-2 rounded text-center">
                        <p className="font-medium text-amber-600 dark:text-amber-400">
                          {remainingAmount} MRU
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {translations.remaining}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {translations.remainingAmountTooltip}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="bg-blue-50 dark:bg-blue-900/30 p-2 rounded text-center">
                        <p className="font-medium text-blue-600 dark:text-blue-400">
                          {formData.montantAttendu} MRU
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {translations.total}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {translations.totalAmountTooltip}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-sm border rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="hover:bg-muted/50"
          >
            {translations.cancel}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || formData.montantPaye <= 0}
            className="min-w-[120px] hover:bg-primary/90 transition-colors"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {translations.saving}
              </>
            ) : (
              <span>{translations.submit}</span>
            )}
          </Button>
        </div>
      </form>
    </TooltipProvider>
  );
}