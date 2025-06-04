
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
import { useAuth } from '@/contexts/AuthContext';

interface MainContentProps {
  activeSection: string;
}

export function MainContent({ activeSection }: MainContentProps) {
  const { user } = useAuth();

  const renderContent = () => {
    // Si utilisateur est admin
    if (user?.role === 'admin') {
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
    
    // Si utilisateur est professeur
    if (user?.role === 'professeur') {
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
    
    // Si utilisateur est étudiant
    if (user?.role === 'eleve') {
      switch (activeSection) {
        case 'dashboard':
          return <Dashboard />;
        case 'schedule-view':
          return <StudentSchedule />;
        case 'my-courses':
          return <StudentCourses />;
        case 'my-grades':
          return <StudentGrades />;
        case 'my-attendance':
          return <StudentAttendance />;
        default:
          return <Dashboard />;
      }
    }
    
    // Section en développement par défaut
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">Section en développement</h2>
          <p className="text-gray-600">Cette fonctionnalité sera bientôt disponible.</p>
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
