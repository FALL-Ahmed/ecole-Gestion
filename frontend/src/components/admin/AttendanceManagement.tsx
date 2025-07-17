import React, { useState } from 'react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardEdit, History, UserX, Gavel } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ProfessorAbsenceManagement, ProfessorAbsenceTracking } from './attendance/ProfessorAbsenceManagement';
import StudentAttendanceRecord from './attendance/StudentAttendanceRecord';
import { DisciplinaryManagement } from './attendance/StudentDiscipline';

export function AttendanceManagement() {
  const { t } = useLanguage();
  const [userType, setUserType] = useState<'prof'|'student'|null>(null);
  const [professorTab, setProfessorTab] = useState<'management'|'tracking'>('management');
  const [studentTab, setStudentTab] = useState<'attendance'|'discipline'>('attendance');

  // Ces états devraient être récupérés depuis votre contexte ou API
  const [professeurs, setProfesseurs] = useState<any[]>([]);
  const [anneesAcademiques, setAnneesAcademiques] = useState<any[]>([]);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('');

  if (!userType) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">{t.attendance.selectUserType}</CardTitle>
            <CardDescription className="text-center">
              {t.attendance.selectUserTypeDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button 
              size="lg" 
              onClick={() => setUserType('prof')}
              className="py-8 text-lg"
            >
              {t.attendance.professorSection}
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              onClick={() => setUserType('student')}
              className="py-8 text-lg"
            >
              {t.attendance.studentSection}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (userType === 'prof') {
    return (
      <div className="space-y-4">
        <Tabs value={professorTab} onValueChange={(v) => setProfessorTab(v as any)} className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-2">
            <TabsTrigger value="management">
              <ClipboardEdit className="h-4 w-4 mr-2" />
              {t.attendance.professorAbsenceManagement}
            </TabsTrigger>
            <TabsTrigger value="tracking">
              <History className="h-4 w-4 mr-2" />
              {t.attendance.professorAbsenceTracking}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {professorTab === 'management' ? (
          <ProfessorAbsenceManagement />
        ) : (
          <ProfessorAbsenceTracking 
            selectedSchoolYearId={selectedSchoolYearId}
            professeurs={professeurs}
            t={t}
            language={t.language}
            anneesAcademiques={anneesAcademiques}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={studentTab} onValueChange={(v) => setStudentTab(v as any)} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 sm:grid-cols-2">
          <TabsTrigger value="attendance">
            <UserX className="h-4 w-4 mr-2" />
            {t.attendance.absenceTitle}
          </TabsTrigger>
         <TabsTrigger value="discipline"> {/* Retirer disabled */}
  <Gavel className="h-4 w-4 mr-2" />
  {t.attendance.disciplineTitle}
</TabsTrigger>
        </TabsList>
      </Tabs>

      {studentTab === 'attendance' && (
        <StudentAttendanceRecord />
      )}
      {studentTab === 'discipline' && (
        <DisciplinaryManagement />
      )}

    </div>
  );
}

export default AttendanceManagement;