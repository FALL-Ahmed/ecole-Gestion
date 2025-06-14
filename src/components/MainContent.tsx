// src/components/MainContent.tsx
import React from 'react';
import { Dashboard } from './Dashboard';
import UserManagement from "./admin/UserManagement";
import SchoolManagement from "./admin/SchoolManagement";
import { CourseManagement } from './admin/CourseManagement';
import { GradeManagement } from './admin/GradeManagement';
import { ScheduleManagement } from './admin/ScheduleManagement';
import { AttendanceManagement } from './admin/AttendanceManagement';
import { ReportManagement } from './admin/ReportManagement';
import { Statistics } from './admin/Statistics';
import { Settings } from './admin/Settings';
import { ChapterProgressMonitoring } from './admin/ChapterProgressMonitoring';
import { CourseMaterials } from './professor/CourseMaterials';
import { ProfessorAttendance } from './professor/ProfessorAttendance';
import { ProfessorSchedule } from './professor/ProfessorSchedule';
import { GradeInput } from './professor/GradeInput';
import { StudentSchedule } from './student/StudentSchedule';
import { StudentCourses } from './student/StudentCourses';
import { StudentGrades } from './student/StudentGrades';
import { StudentAttendance } from './student/StudentAttendance';
import { ChapterPlanning } from './professor/ChapterPlanning';
import { useAuth } from '@/contexts/AuthContext'; // Ensure this import is correct

interface MainContentProps {
  activeSection: string;
}

export function MainContent({ activeSection }: MainContentProps) {
  // Destructure user, isAuthenticated, and isLoading from useAuth()
  const { user, isAuthenticated, isLoading } = useAuth();

  const renderContent = () => {
    // 1. Handle loading state: Show a loading message while AuthContext initializes
    if (isLoading) {
      return (
        <div className="p-6 text-center text-gray-500">
          Chargement du contenu...
        </div>
      );
    }

    // 2. Handle unauthenticated users: If not authenticated, show a message or redirect
    if (!isAuthenticated || !user) {
      // In a real app, you might use react-router-dom's <Navigate to="/login" replace /> here.
      // For now, a simple message:
      return (
        <div className="p-6 text-center text-red-500">
          Vous devez être connecté pour accéder à cette section.
        </div>
      );
    }

    // Now, we are sure that 'user' object exists and is populated.
    // We can confidently check user.role and access user.id.

    // If user is admin
    if (user.role === 'admin') { // 'user' is guaranteed to be non-null here
      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />;
        case 'users':
          return <UserManagement />;
        case 'scolaire':
          return <SchoolManagement />; 
        case 'courses':
          return <CourseManagement />;
        case 'grades':
          return <GradeManagement />;
        case 'schedule':
          return <ScheduleManagement />;
        case 'attendance':
          return <AttendanceManagement />;
        case 'reports':
          return <ReportManagement />;
        case 'stats':
          return <Statistics />;
        case 'settings':
          return <Settings />;
        case 'chapter-monitoring':
          return <ChapterProgressMonitoring />;
        default:
          return <Dashboard />;
      }
    }
    
    // If user is professor
    if (user.role === 'professeur') { // 'user' is guaranteed to be non-null here
      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />;
        case 'course-materials':
          return <CourseMaterials />;
        case 'attendance-mgmt':
          return <ProfessorAttendance />;
        case 'schedule-view':
          return <ProfessorSchedule />;
        case 'grades-input':
          return <GradeInput />;
        case 'chapter-planning':
          return <ChapterPlanning />;
        default:
          return <Dashboard />;
      }
    }
    
    // If user is student (eleve)
    if (user.role === 'eleve') { // 'user' is guaranteed to be non-null here
      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />;
        case 'schedule-view':
          return <StudentSchedule />;
        case 'my-courses':
          return <StudentCourses />;
        case 'my-grades':
          // Pass the userId to StudentGrades here!
          return <StudentGrades userId={user.id} />; 
        case 'my-attendance':
          return <StudentAttendance />;
        default:
          return <Dashboard />;
      }
    }
    
    // Default content for unhandled roles or activeSections (after auth/loading checks)
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Accès non autorisé ou section en développement</h2>
          <p className="text-gray-600">Le contenu demandé n'est pas disponible pour votre rôle ou est en cours de développement.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      {renderContent()}
    </div>
  );
}