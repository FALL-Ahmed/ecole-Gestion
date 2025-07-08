import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

// Importations des composants Admin
import { Dashboard } from './Dashboard';
import UserMan from './admin/UserManagement';
import SchoolManagement from './admin/SchoolManagement';
import { CourseManagement } from './admin/CourseManagement';
import { GradeManagement } from './admin/GradeManagement';
import { ScheduleManagement } from './admin/ScheduleManagement';
import { AttendanceManagement } from './admin/AttendanceManagement';
import { ReportManagement } from './admin/ReportManagement';
import { Statistics } from './admin/Statistics';
import { Settings } from './admin/Settings';
import { ChapterProgressMonitoring } from './admin/ChapterProgressMonitoring';
import { AuditTrail } from './admin/AuditTrail';

// Importations des composants Professeur
import { CourseMaterials } from './professor/CourseMaterials';
import { ProfessorAttendance } from './professor/ProfessorAttendance';
import { ProfessorSchedule } from './professor/ProfessorSchedule';
import { GradeInput } from './professor/GradeInput';
import { ChapterPlanning } from './professor/ChapterPlanning';

// Importations des composants Élève
import { StudentSchedule } from './student/StudentSchedule';
import { StudentCourses } from './student/StudentCourse';
import { StudentGrades } from './student/StudentGrades';
import { StudentAttendance } from './student/StudentAttendance';

interface MainContentProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function MainContent({ activeSection, onSectionChange }: MainContentProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  // Gestion dynamique de la hauteur pour mobile et desktop
  const [windowHeight, setWindowHeight] = useState(window.innerHeight);

  useEffect(() => {
    const handleResize = () => {
      setWindowHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="p-6 text-center text-gray-500">
          Chargement du contenu...
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Sections Admin
  const renderAdminSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'users': return <UserMan />;
      case 'scolaire': return <SchoolManagement onNavigate={onSectionChange} />;
      case 'courses': return <CourseManagement />;
      case 'grades': return <GradeManagement />;
      case 'schedule': return <ScheduleManagement />;
      case 'attendance': return <AttendanceManagement />;
      case 'reports': return <ReportManagement />;
      case 'stats': return <Statistics />;
      case 'historique': return <AuditTrail />;
      case 'settings': return <Settings />;
      case 'chapter-monitoring': return <ChapterProgressMonitoring />;
      default: return <Dashboard />;
    }
  };

  // Sections Professeur
  const renderProfessorSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'course-materials': return <CourseMaterials />;
      case 'schedule-view': return <ProfessorSchedule />;
      case 'grades-input': return <GradeInput />;
      case 'chapter-planning': return <ChapterPlanning />;
      default: return <Dashboard />;
    }
  };

  // Sections Élève
  const renderStudentSection = () => {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'schedule-view': return <StudentSchedule />;
      case 'my-courses': return <StudentCourses />;
      case 'my-grades': return <StudentGrades key={user.id} userId={user.id} />;
      case 'my-attendance': return <StudentAttendance />;
      default: return <Dashboard />;
    }
  };

  const renderContent = () => {
    if (!user) return null;
    
    switch (user.role) {
      case 'admin': return renderAdminSection();
      case 'professeur': return renderProfessorSection();
      case 'eleve': return renderStudentSection();
      default:
        return (
          <div className="p-6 text-center text-gray-600">
            Rôle utilisateur non reconnu. Accès refusé.
          </div>
        );
    }
  };

  return (
    <div 
      className="relative bg-gray-50 dark:bg-gray-900"
      style={{
        // Hauteur totale moins la hauteur de la navbar si elle existe
        height: `calc(${windowHeight}px - var(--navbar-height, 0px))`,
        // Gestion safe-area pour les mobiles (notch, etc.)
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {/* Conteneur principal avec défilement */}
      <div className="h-full overflow-y-auto">
        {/* Contenu dynamique avec padding adaptatif */}
        <main className="min-h-full p-4 md:p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}