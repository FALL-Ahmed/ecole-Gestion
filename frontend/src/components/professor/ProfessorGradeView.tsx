import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { GradeInput } from './GradeInput';
import { ProfessorGradeModification } from './ProfessorGradeModification';
import { useLanguage } from '@/contexts/LanguageContext';
import { Edit, PlusCircle } from 'lucide-react';

export function ProfessorGradeView() {
  const { t } = useLanguage();
  const [view, setView] = useState<'saisie' | 'modification'>('saisie');

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          {t.professorGradeView.title}
        </h1>
        <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <Button
            onClick={() => setView('saisie')}
            variant={view === 'saisie' ? 'default' : 'ghost'}
            className={`flex-1 justify-center gap-2 ${view === 'saisie' ? 'bg-blue-600 text-white' : ''}`}
          >
            <PlusCircle className="h-4 w-4" />
            {t.professorGradeView.enterGrades}
          </Button>
          <Button
            onClick={() => setView('modification')}
            variant={view === 'modification' ? 'default' : 'ghost'}
            className={`flex-1 justify-center gap-2 ${view === 'modification' ? 'bg-blue-600 text-white' : ''}`}
          >
            <Edit className="h-4 w-4" />
            {t.professorGradeView.modifyGrades}
          </Button>
        </div>
      </div>

      <div>
        {view === 'saisie' && <GradeInput />}
        {view === 'modification' && <ProfessorGradeModification />}
      </div>
    </div>
  );
}
