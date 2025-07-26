import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { StudentAttendance } from '../student/StudentAttendance';
import { Loader2 } from 'lucide-react';
import { useParentChildren } from '@/hooks/useParentChildren';
import { ChildSelector, Child } from './ChildSelector';

export function ParentAttendanceView() {
  const { t, language } = useLanguage();
    const { children, loading, error } = useParentChildren();

  const [selectedChild, setSelectedChild] = useState<number | null>(null);
  

  useEffect(() => {
   // Set the first child as selected by default when children are loaded
    if (children.length > 0 && !selectedChild) {
      setSelectedChild(children[0].id);
    }
  }, [children, selectedChild]);


  if (loading) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Loader2 className="mx-auto h-8 w-8 animate-spin" />
        <p>{t.common.loadingData}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 text-center text-red-500 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <h2 className="text-xl font-semibold mb-2">{t.common.loadingError}</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (children.length === 0 && !loading) {
    return (
      <div className={`p-6 text-center text-gray-500 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        <h2 className="text-xl font-semibold mb-2">{t.parent.grades.noChildren}</h2>
        <p>{t.parent.grades.noChildrenDesc}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${language === 'ar' ? 'rtl' : 'ltr'}`}>
      <h1 className={`text-2xl font-bold mb-6 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
        {t.parent.attendance.title}
      </h1>

      <ChildSelector children={children} selectedChild={selectedChild} onChildChange={setSelectedChild} />

      {selectedChild && (() => {
        const selectedChildDetails = children.find(c => c.id === selectedChild);
        return selectedChildDetails ? (
          <div className="mt-6">
            <StudentAttendance key={selectedChild} userId={selectedChild} blocId={selectedChildDetails.blocId} />
          </div>
        ) : null;
      })()}
    </div>
  );
}

export default ParentAttendanceView;
