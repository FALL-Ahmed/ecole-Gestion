
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
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileDown, Printer, Search, Eye } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const classes = ['6ème A', '6ème B', '5ème A', '5ème B', '4ème A', '4ème B', '3ème A', '3ème B'];
const terms = ['Trimestre 1', 'Trimestre 2', 'Trimestre 3'];

const students = [
  { 
    id: 1, 
    name: 'Alice Dupont', 
    avg: '16.4', 
    rank: '1/28', 
    teacherComment: 'Excellente élève, sérieuse et appliquée.',
    principalComment: 'Félicitations pour ce trimestre exemplaire.'
  },
  { 
    id: 2, 
    name: 'Baptiste Martin', 
    avg: '14.8', 
    rank: '5/28', 
    teacherComment: 'Bon travail dans l\'ensemble. Participation active en classe.',
    principalComment: 'Bon trimestre, continuez ainsi.'
  },
  { 
    id: 3, 
    name: 'Clara Bernard', 
    avg: '15.2', 
    rank: '3/28', 
    teacherComment: 'Bons résultats et comportement exemplaire.',
    principalComment: 'Très bon trimestre.'
  },
  { 
    id: 4, 
    name: 'David Petit', 
    avg: '12.5', 
    rank: '15/28', 
    teacherComment: 'Résultats corrects mais peut faire mieux. Manque parfois de concentration.',
    principalComment: 'Des efforts à poursuivre pour progresser.'
  },
  { 
    id: 5, 
    name: 'Emma Richard', 
    avg: '15.8', 
    rank: '2/28', 
    teacherComment: 'Excellent niveau. Élève sérieuse et travailleuse.',
    principalComment: 'Félicitations pour ce trimestre.'
  },
];

export function ReportManagement() {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<any>(null);

  const handlePreviewReport = (student: any) => {
    setSelectedReport(student);
    setPreviewOpen(true);
  };

  const generateAllReports = () => {
    toast({
      title: "Génération des bulletins",
      description: `Les bulletins de ${selectedClass} pour le ${selectedTerm} sont en cours de génération.`,
    });
  };

  const exportReport = () => {
    toast({
      title: "Export en PDF",
      description: `Le bulletin de ${selectedReport?.name} est en cours d'exportation.`,
    });
    setPreviewOpen(false);
  };

  const printReport = () => {
    toast({
      title: "Impression",
      description: `Le bulletin de ${selectedReport?.name} est envoyé à l'imprimante.`,
    });
    setPreviewOpen(false);
  };

  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isFormComplete = selectedClass && selectedTerm;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Gestion des Bulletins</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Sélection</CardTitle>
          <CardDescription>Choisissez la classe et le trimestre</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Trimestre</label>
              <Select onValueChange={setSelectedTerm} value={selectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un trimestre" />
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
          </div>
        </CardContent>
      </Card>

      {isFormComplete ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button onClick={generateAllReports}>
              <FileDown className="mr-2 h-4 w-4" />
              Générer tous les bulletins
            </Button>
            
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Rechercher un élève..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Élève</TableHead>
                      <TableHead>Moyenne</TableHead>
                      <TableHead>Classement</TableHead>
                      <TableHead>État</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.name}
                        </TableCell>
                        <TableCell>{student.avg}/20</TableCell>
                        <TableCell>{student.rank}</TableCell>
                        <TableCell>
                          <Badge className="bg-green-500">Généré</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handlePreviewReport(student)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center shadow-sm">
          <p className="text-gray-500">Veuillez sélectionner une classe et un trimestre pour consulter les bulletins.</p>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulletin scolaire de {selectedReport?.name}</DialogTitle>
            <DialogDescription>
              {selectedClass} - {selectedTerm}
            </DialogDescription>
          </DialogHeader>
          
          {selectedReport && (
            <div className="py-4">
              <div className="border-2 border-gray-300 p-6 rounded-lg">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold">Sources des Sciences</h2>
                  <p className="text-lg font-medium mt-2">Bulletin de Notes - {selectedTerm}</p>
                  <div className="mt-3">
                    <p><span className="font-medium">Élève:</span> {selectedReport.name}</p>
                    <p><span className="font-medium">Classe:</span> {selectedClass}</p>
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
                    <TableRow>
                      <TableCell className="font-medium">Français</TableCell>
                      <TableCell className="text-center">16/20</TableCell>
                      <TableCell className="text-center">13.5/20</TableCell>
                      <TableCell>Très bon niveau à l'écrit comme à l'oral.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Mathématiques</TableCell>
                      <TableCell className="text-center">17/20</TableCell>
                      <TableCell className="text-center">12.8/20</TableCell>
                      <TableCell>Excellent travail, à poursuivre.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Histoire-Géo</TableCell>
                      <TableCell className="text-center">15/20</TableCell>
                      <TableCell className="text-center">12.3/20</TableCell>
                      <TableCell>Bon trimestre, participation active en classe.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Anglais</TableCell>
                      <TableCell className="text-center">16.5/20</TableCell>
                      <TableCell className="text-center">13.1/20</TableCell>
                      <TableCell>Très bon niveau, s'exprime avec aisance.</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Sciences</TableCell>
                      <TableCell className="text-center">18/20</TableCell>
                      <TableCell className="text-center">13.7/20</TableCell>
                      <TableCell>Excellent niveau, intérêt marqué pour la matière.</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                
                <div className="mt-6 space-y-4">
                  <div>
                    <h3 className="font-medium mb-1">Appréciation du professeur principal:</h3>
                    <p className="bg-gray-50 p-3 rounded border border-gray-200">{selectedReport.teacherComment}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium mb-1">Appréciation du directeur:</h3>
                    <p className="bg-gray-50 p-3 rounded border border-gray-200">{selectedReport.principalComment}</p>
                  </div>
                  
                  <div className="flex justify-between pt-4">
                    <div>
                      <p className="font-medium">Moyenne générale: {selectedReport.avg}/20</p>
                      <p className="font-medium">Classement: {selectedReport.rank}</p>
                    </div>
                    <div className="text-right">
                      <p>Fait à Paris, le {new Date().toLocaleDateString('fr-FR')}</p>
                      <p className="font-medium mt-4">Le Chef d'Établissement</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={exportReport}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exporter en PDF
                </Button>
                <Button onClick={printReport}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
