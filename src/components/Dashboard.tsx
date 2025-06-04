import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { Users, BookOpen, GraduationCap, TrendingUp, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function Dashboard() {
  const { user } = useAuth();
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('2023-2024');

  // Mock data for professor classes
  const professorClasses = ['6ème A', '6ème B', '5ème A', '4ème B', '3ème A'];
  
  // Années scolaires disponibles
  const academicYears = [
    '2022-2023',
    '2023-2024',
    '2024-2025'
  ];

  // Données avec année scolaire
  const studentPerformanceData = {
    '2022-2023': [
      { month: 'Sep', moyenne: 13.2 },
      { month: 'Oct', moyenne: 13.8 },
      { month: 'Nov', moyenne: 13.5 },
      { month: 'Dec', moyenne: 14.2 },
      { month: 'Jan', moyenne: 13.9 },
      { month: 'Feb', moyenne: 14.3 },
    ],
    '2023-2024': [
      { month: 'Sep', moyenne: 13.5 },
      { month: 'Oct', moyenne: 14.2 },
      { month: 'Nov', moyenne: 13.8 },
      { month: 'Dec', moyenne: 15.0 },
      { month: 'Jan', moyenne: 14.3 },
      { month: 'Feb', moyenne: 14.8 },
    ],
    '2024-2025': [
      { month: 'Sep', moyenne: 14.0 },
      { month: 'Oct', moyenne: 14.5 },
      { month: 'Nov', moyenne: 14.2 },
      { month: 'Dec', moyenne: 15.2 },
      { month: 'Jan', moyenne: 14.8 },
      { month: 'Feb', moyenne: 15.1 },
    ]
  };

  const statsData = {
    '2022-2023': [
      { name: 'Élèves', value: 230, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 16, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 10, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '85%', icon: TrendingUp, color: 'bg-orange-500' }
    ],
    '2023-2024': [
      { name: 'Élèves', value: 245, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 18, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 12, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '87%', icon: TrendingUp, color: 'bg-orange-500' }
    ],
    '2024-2025': [
      { name: 'Élèves', value: 260, icon: Users, color: 'bg-blue-500' },
      { name: 'Professeurs', value: 20, icon: BookOpen, color: 'bg-green-500' },
      { name: 'Classes', value: 14, icon: GraduationCap, color: 'bg-purple-500' },
      { name: 'Taux de Réussite', value: '89%', icon: TrendingUp, color: 'bg-orange-500' }
    ]
  };

  const gradesByClass = {
    '2022-2023': [
      { class: '6ème A', moyenne: 13.8 },
      { class: '6ème B', moyenne: 13.5 },
      { class: '5ème A', moyenne: 14.7 },
      { class: '5ème B', moyenne: 14.2 },
      { class: '4ème A', moyenne: 13.6 },
      { class: '4ème B', moyenne: 14.3 },
    ],
    '2023-2024': [
      { class: '6ème A', moyenne: 14.2 },
      { class: '6ème B', moyenne: 13.8 },
      { class: '5ème A', moyenne: 15.1 },
      { class: '5ème B', moyenne: 14.5 },
      { class: '4ème A', moyenne: 13.9 },
      { class: '4ème B', moyenne: 14.7 },
    ],
    '2024-2025': [
      { class: '6ème A', moyenne: 14.5 },
      { class: '6ème B', moyenne: 14.2 },
      { class: '5ème A', moyenne: 15.4 },
      { class: '5ème B', moyenne: 14.8 },
      { class: '4ème A', moyenne: 14.2 },
      { class: '4ème B', moyenne: 15.0 },
    ]
  };

  const studentDistribution = {
    '2022-2023': [
      { name: '6ème', value: 65, color: '#8884d8' },
      { name: '5ème', value: 60, color: '#82ca9d' },
      { name: '4ème', value: 55, color: '#ffc658' },
      { name: '3ème', value: 50, color: '#ff7c7c' },
    ],
    '2023-2024': [
      { name: '6ème', value: 68, color: '#8884d8' },
      { name: '5ème', value: 62, color: '#82ca9d' },
      { name: '4ème', value: 58, color: '#ffc658' },
      { name: '3ème', value: 57, color: '#ff7c7c' },
    ],
    '2024-2025': [
      { name: '6ème', value: 70, color: '#8884d8' },
      { name: '5ème', value: 65, color: '#82ca9d' },
      { name: '4ème', value: 60, color: '#ffc658' },
      { name: '3ème', value: 65, color: '#ff7c7c' },
    ]
  };

  const filterDataByClass = (data: any[]) => {
    if (selectedClass === 'all') return data;
    return data.filter(item => item.class === selectedClass || item.name === selectedClass);
  };

  const renderDashboardContent = () => {
    switch (user?.role) {
      case 'admin':
        return (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Tableau de bord administratif</h2>
              <div className="flex gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder="Année scolaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {professorClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {statsData[selectedYear].map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.name} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                          <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        {Icon && (
                          <div className={`p-3 rounded-full ${stat.color} text-white`}>
                            <Icon className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Moyennes par Classe</CardTitle>
                  <CardDescription>Performance académique par classe</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={filterDataByClass(gradesByClass[selectedYear])}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="class" />
                      <YAxis domain={[0, 20]} />
                      <Tooltip />
                      <Bar dataKey="moyenne" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Répartition des Élèves</CardTitle>
                  <CardDescription>Distribution par niveau</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={studentDistribution[selectedYear]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {studentDistribution[selectedYear].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </>
        );

      case 'professeur':
        return (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Vue d'ensemble</h2>
              <div className="flex gap-4">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[150px]">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <SelectValue placeholder="Année scolaire" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {professorClasses.map(cls => (
                      <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Mes Classes</h3>
                  <p className="text-3xl font-bold text-blue-600">5</p>
                  <p className="text-sm text-gray-600">classes assignées</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Élèves</h3>
                  <p className="text-3xl font-bold text-green-600">127</p>
                  <p className="text-sm text-gray-600">élèves au total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Cours cette semaine</h3>
                  <p className="text-3xl font-bold text-purple-600">18</p>
                  <p className="text-sm text-gray-600">heures de cours</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader>
                  <CardTitle>Emploi du Temps de la Semaine</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '6ème A' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Lundi 08:00 - 09:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '5ème B' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Lundi 10:00 - 11:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium">Mathématiques - {selectedClass === 'all' ? '4ème A' : selectedClass}</span>
                      <span className="text-sm text-gray-600">Mardi 14:00 - 15:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Évolution des Notes</CardTitle>
                  <CardDescription>Moyenne de la classe par mois</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={studentPerformanceData[selectedYear]}>
                     <CartesianGrid strokeDasharray="3 3" />
                     <XAxis dataKey="month" />
                     <YAxis domain={[0, 20]} />
                     <Tooltip />
                     <Bar dataKey="moyenne" fill="#3b82f6" />
                    </BarChart>

                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Suivi des Élèves</CardTitle>
                <CardDescription>Performance académique des élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Élève</th>
                        <th className="text-left py-3 px-4">Classe</th>
                        <th className="text-left py-3 px-4">Moyenne</th>
                        <th className="text-left py-3 px-4">Évolution</th>
                        <th className="text-left py-3 px-4">Absences</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Alice Dupont</td>
                        <td className="py-3 px-4">6ème A</td>
                        <td className="py-3 px-4">15.2/20</td>
                        <td className="py-3 px-4 text-green-600">+1.3</td>
                        <td className="py-3 px-4">2</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Baptiste Martin</td>
                        <td className="py-3 px-4">6ème A</td>
                        <td className="py-3 px-4">14.8/20</td>
                        <td className="py-3 px-4 text-green-600">+0.7</td>
                        <td className="py-3 px-4">0</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">Clara Bernard</td>
                        <td className="py-3 px-4">5ème B</td>
                        <td className="py-3 px-4">12.5/20</td>
                        <td className="py-3 px-4 text-red-600">-0.8</td>
                        <td className="py-3 px-4">3</td>
                      </tr>
                      <tr className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">David Petit</td>
                        <td className="py-3 px-4">6ème B</td>
                        <td className="py-3 px-4">16.1/20</td>
                        <td className="py-3 px-4 text-green-600">+0.2</td>
                        <td className="py-3 px-4">1</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        );

      case 'eleve':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Moyenne Générale</h3>
                  <p className="text-3xl font-bold text-blue-600">14.8</p>
                  <p className="text-sm text-gray-600">/20</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Rang dans la Classe</h3>
                  <p className="text-3xl font-bold text-green-600">3ème</p>
                  <p className="text-sm text-gray-600">sur 28 élèves</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-2">Cours Aujourd'hui</h3>
                  <p className="text-3xl font-bold text-purple-600">6</p>
                  <p className="text-sm text-gray-600">cours programmés</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Prochains Cours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Mathématiques</p>
                        <p className="text-sm text-gray-600">Salle 201</p>
                      </div>
                      <span className="text-sm font-medium">08:00 - 09:00</span>
                    </div>
                    <div className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">Français</p>
                        <p className="text-sm text-gray-600">Salle 105</p>
                      </div>
                      <span className="text-sm font-medium">09:00 - 10:00</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Dernières Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span>Contrôle Mathématiques</span>
                      <span className="font-bold text-green-600">16/20</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Devoir Français</span>
                      <span className="font-bold text-blue-600">14/20</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Exposé Histoire</span>
                      <span className="font-bold text-purple-600">15/20</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Tableau de Bord - {user?.role === 'admin' ? 'Administration' : 
                               user?.role === 'professeur' ? 'Professeur' : 'eleve'}
        </h1>
        <p className="text-gray-600">
          Bienvenue, {user?.nom}
        </p>
      </div>
      
      {renderDashboardContent()}
    </div>
  );
}
