
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FileDown, Printer, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Données des notes
const grades = {
  'Trimestre 1': [
    { subject: 'Mathématiques', homework1: 15, homework2: 16, exam: 17, average: 16.2, classAvg: 13.5 },
    { subject: 'Français', homework1: 14, homework2: 15, exam: 16, average: 15.2, classAvg: 12.8 },
    { subject: 'Histoire-Géographie', homework1: 13, homework2: 14, exam: 15, average: 14.3, classAvg: 12.5 },
    { subject: 'Anglais', homework1: 17, homework2: 16, exam: 18, average: 17.2, classAvg: 13.1 },
    { subject: 'Sciences', homework1: 16, homework2: 17, exam: 15, average: 15.8, classAvg: 12.9 },
    { subject: 'Espagnol', homework1: 14, homework2: 15, exam: 13, average: 13.8, classAvg: 12.2 },
    { subject: 'Arts Plastiques', homework1: 18, homework2: 17, exam: 16, average: 16.8, classAvg: 14.5 },
    { subject: 'EPS', homework1: 15, homework2: 16, exam: 14, average: 14.8, classAvg: 13.8 },
    { subject: 'Musique', homework1: 17, homework2: 18, exam: 16, average: 16.8, classAvg: 13.9 },
  ],
  'Trimestre 2': [
    { subject: 'Mathématiques', homework1: 16, homework2: 17, exam: 18, average: 17.2, classAvg: 13.8 },
    { subject: 'Français', homework1: 15, homework2: 16, exam: 17, average: 16.2, classAvg: 13.0 },
    { subject: 'Histoire-Géographie', homework1: 14, homework2: 15, exam: 16, average: 15.3, classAvg: 12.7 },
    { subject: 'Anglais', homework1: 18, homework2: 17, exam: 18, average: 17.7, classAvg: 13.3 },
    { subject: 'Sciences', homework1: 17, homework2: 16, exam: 18, average: 17.2, classAvg: 13.1 },
    { subject: 'Espagnol', homework1: 15, homework2: 14, exam: 15, average: 14.8, classAvg: 12.5 },
    { subject: 'Arts Plastiques', homework1: 17, homework2: 18, exam: 17, average: 17.3, classAvg: 14.7 },
    { subject: 'EPS', homework1: 16, homework2: 15, exam: 17, average: 16.2, classAvg: 14.0 },
    { subject: 'Musique', homework1: 18, homework2: 18, exam: 17, average: 17.5, classAvg: 14.1 },
  ],
  'Trimestre 3': [
    { subject: 'Mathématiques', homework1: 17, homework2: 18, exam: 19, average: 18.4, classAvg: 14.0 },
    { subject: 'Français', homework1: 16, homework2: 17, exam: 18, average: 17.3, classAvg: 13.2 },
    { subject: 'Histoire-Géographie', homework1: 15, homework2: 16, exam: 17, average: 16.3, classAvg: 12.9 },
    { subject: 'Anglais', homework1: 19, homework2: 18, exam: 19, average: 18.7, classAvg: 13.5 },
    { subject: 'Sciences', homework1: 18, homework2: 17, exam: 19, average: 18.2, classAvg: 13.3 },
    { subject: 'Espagnol', homework1: 16, homework2: 15, exam: 17, average: 16.2, classAvg: 12.7 },
    { subject: 'Arts Plastiques', homework1: 18, homework2: 19, exam: 18, average: 18.3, classAvg: 14.9 },
    { subject: 'EPS', homework1: 17, homework2: 16, exam: 18, average: 17.2, classAvg: 14.2 },
    { subject: 'Musique', homework1: 19, homework2: 18, exam: 18, average: 18.2, classAvg: 14.3 },
  ],
};

// Calcul des moyennes générales par trimestre
const generalAverages = {
  'Trimestre 1': grades['Trimestre 1'].reduce((acc, subj) => acc + subj.average, 0) / grades['Trimestre 1'].length,
  'Trimestre 2': grades['Trimestre 2'].reduce((acc, subj) => acc + subj.average, 0) / grades['Trimestre 2'].length,
  'Trimestre 3': grades['Trimestre 3'].reduce((acc, subj) => acc + subj.average, 0) / grades['Trimestre 3'].length,
};

// Données pour le graphique d'évolution
const progressData = Object.keys(generalAverages).map(term => ({
  name: term,
  moyenne: generalAverages[term],
  moyenneClasse: 13.5 // Valeur fixe pour l'exemple
}));

// Données pour le graphique par matière
const subjectComparisonData = grades['Trimestre 3'].map(subject => ({
  name: subject.subject.substring(0, 3),
  moyenne: subject.average,
  moyenneClasse: subject.classAvg,
}));

export function StudentGrades() {
  const [selectedTerm, setSelectedTerm] = useState<string>('Trimestre 3');
  const [reportPreviewOpen, setReportPreviewOpen] = useState<boolean>(false);
  
  const selectedGrades = grades[selectedTerm] || [];
  const selectedAverage = generalAverages[selectedTerm] || 0;
  
  const downloadReport = () => {
    toast({
      title: "Téléchargement",
      description: `Le bulletin de ${selectedTerm} est en cours de téléchargement.`,
    });
  };
  
  const printReport = () => {
    toast({
      title: "Impression",
      description: `Le bulletin de ${selectedTerm} est envoyé à l'imprimante.`,
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Mes Notes & Bulletins</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Moyenne Générale</h3>
            <p className="text-3xl font-bold text-blue-600">{selectedAverage.toFixed(1)}</p>
            <p className="text-sm text-gray-600">/20</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Rang dans la classe</h3>
            <p className="text-3xl font-bold text-green-600">2ème</p>
            <p className="text-sm text-gray-600">sur 28 élèves</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">Appréciation générale</h3>
            <p className="text-md text-gray-600">Excellent trimestre, continue ainsi !</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sélectionner un trimestre" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(grades).map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <h2 className="text-lg font-semibold">
            Notes {selectedTerm}
          </h2>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setReportPreviewOpen(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Voir mon bulletin
          </Button>
        </div>
      </div>

      <Tabs defaultValue="grades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="grades">Détail des notes</TabsTrigger>
          <TabsTrigger value="charts">Graphiques</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grades">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matière</TableHead>
                      <TableHead className="text-center">Devoir 1</TableHead>
                      <TableHead className="text-center">Devoir 2</TableHead>
                      <TableHead className="text-center">Composition</TableHead>
                      <TableHead className="text-center">Moyenne</TableHead>
                      <TableHead className="text-center">Moyenne classe</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedGrades.map((grade, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{grade.subject}</TableCell>
                        <TableCell className="text-center">{grade.homework1}/20</TableCell>
                        <TableCell className="text-center">{grade.homework2}/20</TableCell>
                        <TableCell className="text-center">{grade.exam}/20</TableCell>
                        <TableCell className="text-center font-semibold">{grade.average}/20</TableCell>
                        <TableCell className="text-center text-gray-600">{grade.classAvg}/20</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Évolution des moyennes</CardTitle>
                <CardDescription>Progression sur les 3 trimestres</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="moyenne" 
                      name="Ma moyenne" 
                      stroke="#3b82f6" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="moyenneClasse" 
                      name="Moyenne classe" 
                      stroke="#9ca3af" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Comparaison par matière</CardTitle>
                <CardDescription>Trimestre actuel</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subjectComparisonData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 10,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="moyenne" 
                      name="Ma moyenne" 
                      fill="#3b82f6" 
                    />
                    <Bar 
                      dataKey="moyenneClasse" 
                      name="Moyenne classe" 
                      fill="#9ca3af" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      
      <Dialog open={reportPreviewOpen} onOpenChange={setReportPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulletin de notes - {selectedTerm}</DialogTitle>
            <DialogDescription>
              Classe: 6ème A
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="border-2 border-gray-300 p-6 rounded-lg">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">Sources des Sciences</h2>
                <p className="text-lg font-medium mt-2">Bulletin de Notes - {selectedTerm}</p>
                <div className="mt-3">
                  <p><span className="font-medium">Élève:</span> Marie Durand</p>
                  <p><span className="font-medium">Classe:</span> 6ème A</p>
                </div>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matière</TableHead>
                    <TableHead className="text-center">Moyenne</TableHead>
                    <TableHead className="text-center">Moyenne de classe</TableHead>
                    <TableHead>Appréciation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedGrades.map((grade, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{grade.subject}</TableCell>
                      <TableCell className="text-center">{grade.average}/20</TableCell>
                      <TableCell className="text-center">{grade.classAvg}/20</TableCell>
                      <TableCell>
                        {grade.average > 16 
                          ? "Excellent niveau, continue ainsi !" 
                          : grade.average > 14 
                          ? "Très bon travail, à poursuivre."
                          : grade.average > 12
                          ? "Bon trimestre, peut encore progresser."
                          : "Des efforts à poursuivre pour progresser."}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Appréciation du professeur principal:</h3>
                  <p className="bg-gray-50 p-3 rounded border border-gray-200">
                    {selectedTerm === 'Trimestre 3' 
                      ? "Excellent trimestre. Marie a su maintenir un excellent niveau tout au long de l'année. Sa participation en classe est toujours pertinente."
                      : selectedTerm === 'Trimestre 2'
                      ? "Très bon trimestre. Marie progresse et montre un réel investissement dans son travail. Sa participation est de qualité."
                      : "Bon début d'année. Marie est une élève sérieuse et attentive qui fournit un travail régulier."}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-1">Appréciation du directeur:</h3>
                  <p className="bg-gray-50 p-3 rounded border border-gray-200">
                    {selectedTerm === 'Trimestre 3' 
                      ? "Félicitations pour cette excellente année scolaire !"
                      : selectedTerm === 'Trimestre 2'
                      ? "Très bon trimestre, continuez ainsi."
                      : "Bon trimestre d'adaptation, continuez vos efforts."}
                  </p>
                </div>
                
                <div className="flex justify-between pt-4">
                  <div>
                    <p className="font-medium">Moyenne générale: {selectedAverage.toFixed(2)}/20</p>
                    <p className="font-medium">Classement: 2ème / 28</p>
                  </div>
                  <div className="text-right">
                    <p>Fait à Paris, le {new Date().toLocaleDateString('fr-FR')}</p>
                    <p className="font-medium mt-4">Le Chef d'Établissement</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={downloadReport}>
                <FileDown className="mr-2 h-4 w-4" />
                Exporter en PDF
              </Button>
              <Button onClick={printReport}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
