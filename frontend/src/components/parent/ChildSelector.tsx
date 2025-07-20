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
import { useLanguage } from '@/contexts/LanguageContext';

interface Child {
  id: number;
  prenom: string;
  nom: string;
  classe: {
    id: number;
    nom: string;
  };
}

interface ChildSelectorProps {
  children: Child[];
  selectedChild: number | null;
  onChildChange: (childId: number) => void;
}

export function ChildSelector({ children, selectedChild, onChildChange }: ChildSelectorProps) {
  const { t, language } = useLanguage();

  return (
    <Card className="mb-6">
      <CardHeader className={language === 'ar' ? 'text-right' : 'text-left'}>
        <CardTitle>{t.parent.grades.childSelection}</CardTitle>
        <CardDescription>{t.parent.grades.childSelectionDesc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={selectedChild ? String(selectedChild) : ''}
          onValueChange={(value) => onChildChange(Number(value))}
          dir={language === 'ar' ? 'rtl' : 'ltr'}
        >
          <SelectTrigger className="w-full md:w-1/2">
            <SelectValue placeholder={t.parent.grades.selectChild} />
          </SelectTrigger>
          <SelectContent>
            {children.map(child => (
              <SelectItem key={child.id} value={String(child.id)}>
                {child.prenom} {child.nom} ({t.common.class}: {child.classe.nom})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}

