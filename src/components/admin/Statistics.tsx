
import React, { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const attendanceData = [
  { name: '6ème A', presence: 95, absence: 5 },
  { name: '6ème B', presence: 92, absence: 8 },
  { name: '5ème A', presence: 94, absence: 6 },
  { name: '5ème B', presence: 90, absence: 10 },
  { name: '4ème A', presence: 93, absence: 7 },
  { name: '4ème B', presence: 91, absence: 9 },
  { name: '3ème A', presence: 89, absence: 11 },
  { name: '3ème B', presence: 88, absence: 12 },
];

const gradesData = [
  { name: '6ème A', moyenne: 14.2 },
  { name: '6ème B', moyenne: 13.8 },
  { name: '5ème A', moyenne: 15.1 },
  { name: '5ème B', moyenne: 14.5 },
  { name: '4ème A', moyenne: 13.9 },
  { name: '4ème B', moyenne: 14.7 },
  { name: '3ème A', moyenne: 13.2 },
  { name: '3ème B', moyenne: 13.5 },
];

const studentDistribution = [
  { name: '6ème', value: 65, color: '#8884d8' },
  { name: '5ème', value: 60, color: '#83a6ed' },
  { name: '4ème', value: 58, color: '#8dd1e1' },
  { name: '3ème', value: 62, color: '#82ca9d' },
];

const genderDistribution = [
  { name: 'Filles', value: 130, color: '#FF8042' },
  { name: 'Garçons', value: 115, color: '#0088FE' },
];

const monthlyAttendanceData = [
  { name: 'Septembre', presence: 97, absence: 3 },
  { name: 'Octobre', presence: 95, absence: 5 },
  { name: 'Novembre', presence: 93, absence: 7 },
  { name: 'Décembre', presence: 91, absence: 9 },
  { name: 'Janvier', presence: 90, absence: 10 },
  { name: 'Février', presence: 92, absence: 8 },
  { name: 'Mars', presence: 94, absence: 6 },
  { name: 'Avril', presence: 93, absence: 7 },
  { name: 'Mai', presence: 94, absence: 6 },
  { name: 'Juin', presence: 91, absence: 9 },
];

const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Année complète'];
const classes = ['Toutes les classes', '6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];

// Données par classe pour simulation
const classSpecificData = {
  '6ème A': {
    attendance: { presence: 95, absence: 5 },
    grades: { moyenne: 14.2 },
    monthlyAttendance: [
      { name: 'Septembre', presence: 97, absence: 3 },
      { name: 'Octobre', presence: 96, absence: 4 },
      { name: 'Novembre', presence: 95, absence: 5 },
      { name: 'Décembre', presence: 94, absence: 6 },
      { name: 'Janvier', presence: 93, absence: 7 },
      { name: 'Février', presence: 94, absence: 6 },
      { name: 'Mars', presence: 95, absence: 5 },
      { name: 'Avril', presence: 96, absence: 4 },
      { name: 'Mai', presence: 95, absence: 5 },
      { name: 'Juin', presence: 93, absence: 7 },
    ],
    subjectGrades: [
      { name: 'Mathématiques', taux: 87 },
      { name: 'Français', taux: 84 },
      { name: 'Histoire-Géo', taux: 80 },
      { name: 'Sciences', taux: 90 },
      { name: 'Anglais', taux: 82 },
    ]
  },
  // Données supplémentaires pour d'autres classes...
};

export function Statistics() {
  const [selectedTerm, setSelectedTerm] = useState<string>('Année complète');
  const [selectedClass, setSelectedClass] = useState<string>('Toutes les classes');
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  // Fonction pour filtrer les données selon la classe sélectionnée
  const getFilteredData = (dataType: string) => {
    if (selectedClass === 'Toutes les classes') {
      switch (dataType) {
        case 'attendance':
          return attendanceData;
        case 'grades':
          return gradesData;
        case 'monthlyAttendance':
          return monthlyAttendanceData;
        default:
          return [];
      }
    } else if (classSpecificData[selectedClass as keyof typeof classSpecificData]) {
      const classData = classSpecificData[selectedClass as keyof typeof classSpecificData];
      switch (dataType) {
        case 'attendance':
          return [{ name: selectedClass, ...classData.attendance }];
        case 'grades':
          return [{ name: selectedClass, ...classData.grades }];
        case 'monthlyAttendance':
          return classData.monthlyAttendance;
        case 'subjectGrades':
          return classData.subjectGrades;
        default:
          return [];
      }
    }
    return [];
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Statistiques</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
          <CardDescription>Visualisez les statistiques par période et par classe</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Période</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une période" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((term) => (
                    <SelectItem key={term} value={term}>
                      {term}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Classe</label>
              <Select onValueChange={setSelectedClass} value={selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls} value={cls}>
                      {cls}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="grades">Notes et réussite</TabsTrigger>
          <TabsTrigger value="attendance">Assiduité</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition des élèves par niveau</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {studentDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Répartition par genre</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={genderDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {genderDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Moyenne générale par classe</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={500}
                  height={300}
                  data={gradesData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 20]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="moyenne" fill="#3b82f6" name="Moyenne sur 20" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Taux de réussite par matière</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    width={500}
                    height={300}
                    data={[
                      { name: 'Mathématiques', taux: 85 },
                      { name: 'Français', taux: 82 },
                      { name: 'Histoire-Géo', taux: 78 },
                      { name: 'Sciences', taux: 88 },
                      { name: 'Anglais', taux: 80 },
                    ]}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="taux" name="Taux de réussite (%)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Évolution des moyennes</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    width={500}
                    height={300}
                    data={[
                      { name: 'Trim. 1', moyenne6A: 13.5, moyenne5A: 14.2, moyenne4A: 13.1, moyenne3A: 12.8 },
                      { name: 'Trim. 2', moyenne6A: 13.8, moyenne5A: 14.5, moyenne4A: 13.4, moyenne3A: 12.9 },
                      { name: 'Trim. 3', moyenne6A: 14.2, moyenne5A: 15.1, moyenne4A: 13.9, moyenne3A: 13.2 },
                    ]}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[10, 16]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="moyenne6A" name="6ème A" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="moyenne5A" name="5ème A" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="moyenne4A" name="4ème A" stroke="#ffc658" />
                    <Line type="monotone" dataKey="moyenne3A" name="3ème A" stroke="#ff8042" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Taux d'assiduité par classe</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  width={500}
                  height={300}
                  data={attendanceData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="presence" name="Présence (%)" stackId="a" fill="#82ca9d" />
                  <Bar dataKey="absence" name="Absence (%)" stackId="a" fill="#ff8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Évolution des absences au cours de l'année</CardTitle>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  width={500}
                  height={300}
                  data={monthlyAttendanceData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="absence" name="Taux d'absence (%)" stroke="#ff8042" activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
