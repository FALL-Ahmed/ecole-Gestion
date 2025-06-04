import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, School, ChevronRight, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

// Types
type Course = {
  time: string;
  subject: string;
  teacher: string;
  room: string;
  color: string;
  duration: number;
};

type ScheduleData = {
  [key: string]: Course[];
};

// Données optimisées avec durée des cours
const COURSES: ScheduleData = {
  Lundi: [
    { time: '08:00-09:30', subject: 'Maths', teacher: 'M. Dubois', room: '101', color: 'bg-blue-100 text-blue-800 border-blue-300', duration: 90 },
    { time: '10:00-12:00', subject: 'Français', teacher: 'Mme Bernard', room: '105', color: 'bg-red-100 text-red-800 border-red-300', duration: 120 },
  ],
  Mardi: [
    { time: '08:30-10:00', subject: 'Physique', teacher: 'M. Thomas', room: 'Lab1', color: 'bg-green-100 text-green-800 border-green-300', duration: 90 },
    { time: '13:00-15:00', subject: 'Chimie', teacher: 'Mme Leroy', room: 'Lab2', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', duration: 120 },
  ],
  Mercredi: [
    { time: '09:00-12:00', subject: 'Sport', teacher: 'M. Dupont', room: 'Gym', color: 'bg-orange-100 text-orange-800 border-orange-300', duration: 180 },
  ],
  Jeudi: [
    { time: '14:00-16:00', subject: 'Histoire', teacher: 'Mme Legrand', room: '203', color: 'bg-purple-100 text-purple-800 border-purple-300', duration: 120 },
    { time: '16:30-18:00', subject: 'Géographie', teacher: 'M. Martin', room: '203', color: 'bg-violet-100 text-violet-800 border-violet-300', duration: 90 },
  ],
  Vendredi: [
    { time: '09:00-11:00', subject: 'Anglais', teacher: 'Mme Smith', room: '102', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', duration: 120 },
    { time: '11:30-12:30', subject: 'Philosophie', teacher: 'M. Durand', room: '104', color: 'bg-amber-100 text-amber-800 border-amber-300', duration: 60 },
  ]
};

const DAYS = Object.keys(COURSES);
const HOURS = Array.from({ length: 7 }, (_, i) => `${8 + i}:00`);

export function StudentSchedule() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0);

  // Mettre à jour l'heure actuelle chaque minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Déterminer le jour actuel
  useEffect(() => {
    const today = currentTime.toLocaleDateString('fr-FR', { weekday: 'long' });
    setSelectedDay(today);
  }, [currentTime]);

  const today = currentTime.toLocaleDateString('fr-FR', { weekday: 'long' });
  const todayCourses = COURSES[today] || [];

  // Trouver le prochain cours
  const nextCourse = todayCourses.find(course => {
    const [start] = course.time.split('-');
    const [hours, minutes] = start.split(':').map(Number);
    const courseTime = new Date();
    courseTime.setHours(hours, minutes, 0, 0);
    return courseTime > currentTime;
  });

  // Calculer le temps restant avant le prochain cours
  const getTimeUntilNextCourse = () => {
    if (!nextCourse) return null;
    
    const [start] = nextCourse.time.split('-');
    const [hours, minutes] = start.split(':').map(Number);
    const courseTime = new Date();
    courseTime.setHours(hours, minutes, 0, 0);
    
    const diff = courseTime.getTime() - currentTime.getTime();
    const hoursLeft = Math.floor(diff / (1000 * 60 * 60));
    const minutesLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { hours: hoursLeft, minutes: minutesLeft };
  };

  const timeUntilNext = getTimeUntilNextCourse();

  // Calculer la progression du cours actuel
  const getCurrentCourseProgress = () => {
    const currentCourse = todayCourses.find(course => {
      const [start, end] = course.time.split('-');
      const [startHours, startMins] = start.split(':').map(Number);
      const [endHours, endMins] = end.split(':').map(Number);
      
      const startTime = new Date();
      startTime.setHours(startHours, startMins, 0, 0);
      
      const endTime = new Date();
      endTime.setHours(endHours, endMins, 0, 0);
      
      return currentTime >= startTime && currentTime <= endTime;
    });

    if (!currentCourse) return null;

    const [start, end] = currentCourse.time.split('-');
    const [startHours, startMins] = start.split(':').map(Number);
    const [endHours, endMins] = end.split(':').map(Number);
    
    const startTime = new Date();
    startTime.setHours(startHours, startMins, 0, 0);
    
    const endTime = new Date();
    endTime.setHours(endHours, endMins, 0, 0);
    
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = currentTime.getTime() - startTime.getTime();
    const progress = (elapsed / totalDuration) * 100;

    return { course: currentCourse, progress };
  };

  const currentCourseProgress = getCurrentCourseProgress();

  // Calculer le total des heures de cours par semaine
  const weeklyHours = Object.values(COURSES).reduce((total, dayCourses) => {
    return total + dayCourses.reduce((dayTotal, course) => dayTotal + course.duration, 0);
  }, 0) / 60;

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mon Emploi du Temps</h1>
          <p className="text-gray-600">
            {currentTime.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(weekOffset + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Badge variant="secondary" className="px-3 py-1">
            Semaine {weekOffset === 0 ? 'courante' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Carte Aujourd'hui */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <span>Aujourd'hui ({today})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayCourses.length > 0 ? (
              <div className="space-y-3">
                {todayCourses.map((course, i) => (
                  <div 
                    key={i}
                    className={`p-3 rounded-lg ${course.color} border-l-4`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold">{course.subject}</h3>
                      <Badge variant="outline" className="bg-white/50">
                        {course.time}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <User className="w-4 h-4" />
                      <span>{course.teacher}</span>
                      <School className="w-4 h-4 ml-2" />
                      <span>Salle {course.room}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Aucun cours aujourd'hui
              </div>
            )}
          </CardContent>
          <CardFooter className="bg-gray-50 py-3 px-4">
            <div className="text-sm text-gray-600">
              Total aujourd'hui: {todayCourses.reduce((sum, course) => sum + course.duration, 0) / 60}h
            </div>
          </CardFooter>
        </Card>

        {/* Carte Prochain Cours */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Prochain Cours</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {nextCourse ? (
              <div className="flex flex-col items-center justify-center p-4">
                <div className={`w-full p-4 rounded-lg ${nextCourse.color} text-center mb-4`}>
                  <h3 className="text-xl font-bold mb-1">{nextCourse.subject}</h3>
                  <p className="text-sm">{nextCourse.time}</p>
                </div>
                
                {timeUntilNext && (
                  <div className="w-full mb-4">
                    <div className="text-sm text-gray-600 mb-1">
                      Temps restant: {timeUntilNext.hours > 0 ? `${timeUntilNext.hours}h ` : ''}{timeUntilNext.minutes}min
                    </div>
                    <Progress 
                      value={(1 - (timeUntilNext.minutes + timeUntilNext.hours * 60) / 120) * 100} 
                      className="h-2"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Professeur</p>
                    <p className="font-medium">{nextCourse.teacher}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Salle</p>
                    <p className="font-medium">{nextCourse.room}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Plus de cours aujourd'hui
              </div>
            )}
          </CardContent>
        </Card>

        {/* Carte Cours en Cours */}
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span>Cours Actuel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentCourseProgress ? (
              <div className="flex flex-col items-center justify-center p-4">
                <div className={`w-full p-4 rounded-lg ${currentCourseProgress.course.color} text-center mb-4`}>
                  <h3 className="text-xl font-bold mb-1">{currentCourseProgress.course.subject}</h3>
                  <p className="text-sm">{currentCourseProgress.course.time}</p>
                </div>
                
                <div className="w-full mb-4">
                  <div className="text-sm text-gray-600 mb-1">
                    Progression: {Math.round(currentCourseProgress.progress)}%
                  </div>
                  <Progress value={currentCourseProgress.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Professeur</p>
                    <p className="font-medium">{currentCourseProgress.course.teacher}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm text-gray-500">Salle</p>
                    <p className="font-medium">{currentCourseProgress.course.room}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                Aucun cours en ce moment
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Emploi du temps complet */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Emploi du temps hebdomadaire</CardTitle>
              <p className="text-sm text-gray-600">Total hebdomadaire: {weeklyHours}h de cours</p>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'list')}>
              <TabsList>
                <TabsTrigger value="grid">Vue Grille</TabsTrigger>
                <TabsTrigger value="list">Vue Liste</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {viewMode === 'grid' ? (
            <div className="overflow-x-auto pb-2">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-6 gap-2 mb-2">
                  <div className="font-medium p-2">Heures</div>
                  {DAYS.map(day => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`p-2 rounded font-medium text-center transition-colors ${
                        selectedDay === day 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-6 gap-2 mb-2">
                    <div className="p-2 text-sm text-gray-500 flex items-center">{hour}</div>
                    {DAYS.map(day => {
                      const course = COURSES[day]?.find(c => {
                        const [start] = c.time.split('-');
                        const [courseHour] = start.split(':');
                        return courseHour === hour.split(':')[0];
                      });
                      
                      return (
                        <div
                          key={`${day}-${hour}`}
                          className={`p-2 rounded border min-h-[60px] ${
                            course 
                              ? `${course.color} cursor-pointer shadow-sm relative` 
                              : 'bg-gray-50'
                          } ${
                            day === selectedDay ? 'ring-2 ring-blue-400' : ''
                          }`}
                        >
                          {course && (
                            <>
                              <p className="font-medium">{course.subject}</p>
                              <p className="text-xs mt-1">Salle {course.room}</p>
                              <div className="absolute bottom-1 right-1 text-xs text-gray-600">
                                {course.time.split('-')[1]}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <Tabs defaultValue={today} className="w-full">
              <TabsList className="grid grid-cols-5">
                {DAYS.map(day => (
                  <TabsTrigger key={day} value={day}>
                    {day}
                  </TabsTrigger>
                ))}
              </TabsList>

              {DAYS.map(day => (
                <TabsContent key={day} value={day} className="mt-4">
                  {COURSES[day]?.length > 0 ? (
                    <div className="space-y-3">
                      {COURSES[day].map((course, i) => (
                        <div
                          key={i}
                          className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{course.subject}</h3>
                              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <User className="w-4 h-4" />
                                <span>{course.teacher}</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end">
                              <Badge>{course.time}</Badge>
                              <div className="mt-1 text-sm flex items-center">
                                <School className="w-4 h-4 mr-1" />
                                Salle {course.room}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Durée: {course.duration} min
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun cours prévu ce jour
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}