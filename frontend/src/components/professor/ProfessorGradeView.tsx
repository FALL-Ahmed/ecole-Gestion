import React from 'react';
import { GradeInput } from './GradeInput';
import { ProfessorGradeModification } from './ProfessorGradeModification';
import { useLanguage } from '@/contexts/LanguageContext';
import { Edit, PlusCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ProfessorGradeView() {
  const { t } = useLanguage();

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="saisie" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            {t.professorGradeView.title}
          </h1>
          <TabsList className="grid w-full sm:w-auto sm:grid-cols-2">
            <TabsTrigger value="saisie" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              {t.professorGradeView.enterGrades}
            </TabsTrigger>
            <TabsTrigger value="modification" className="gap-2">
              <Edit className="h-4 w-4" />
              {t.professorGradeView.modifyGrades}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="saisie"><GradeInput /></TabsContent>
        <TabsContent value="modification"><ProfessorGradeModification /></TabsContent>
      </Tabs>
    </div>
  );
}
