import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { useEstablishmentInfo } from '@/contexts/EstablishmentInfoContext';
import { useDebounce } from 'use-debounce';
import ReactDOMServer from 'react-dom/server';
import { useLanguage } from '@/contexts/LanguageContext';

// Interfaces
interface AnneeAcademique {
  id: number;
  libelle: string;
  date_debut: string;
  date_fin: string;
}

interface Classe {
  id: number;
  nom: string;
  annee_scolaire_id: number;
}

interface Eleve {
  id: number;
  nom: string;
  prenom: string;
  classeId: number;
  inscriptionId: number;
}

interface Matiere {
  id: number;
  nom: string;
}

interface CoefficientClasse {
  id: number;
  matiere_id: number;
  classe_id: number;
  coefficient: number;
}

interface Trimestre {
  id: number;
  anneeScolaire: {
    id: number;
    libelle: string;
  };
  nom: string;
  date_debut: string;
  date_fin: string;
}

interface Evaluation {
  id: number;
  matiere_id: number;
  matiere?: Matiere;
  classe_id: number;
  professeur_id: number;
  type: 'Devoir' | 'Composition';
  date_eval: string;
  trimestre: number;
  libelle: string;
  annee_scolaire_id: number;
}

interface AbsenceAPI {
  id: number;
  etudiant_id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  justifie: boolean;
  justification: string | null;
  annee_scolaire_id: number;
}

interface Note {
  id: number;
  evaluation: { id: number; matiere?: Matiere };
  etudiant: { id: number; nom?: string; prenom?: string };
  note: number;
}

interface EvaluationDetailBulletin {
  id: number;
  type: 'Devoir' | 'Composition';
  libelle: string;
  note: number | '00';
}

interface MatiereDetailBulletin {
  matiere: string;
  coefficient: number;
  notesEvaluations: EvaluationDetailBulletin[];
  moyenneMatiere: number;
  moyenneDevoirsPonderee?: number;
  appreciation: string;
}

interface BulletinEleve {
  id: number;
  name: string;
  avg: string;
  rank: string;
  teacherComment: string;
  principalComment: string;
  notesParMatiere: MatiereDetailBulletin[];
  absencesNonJustifieesHeures?: number;
  totalElevesClasse?: number;
}
interface PrintableReportProps {
  report: BulletinEleve | null;
  establishmentInfo: { schoolName: string, address: string, phone?: string, website?: string };
  selectedClass: string;
  selectedTerm: string;
  selectedYear: string;
  dynamicEvaluationHeaders: string[];
  getMention: (m: number) => string;
  t: (key: string) => string; // Ajoutez cette ligne

}
// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

// Fonctions API optimisées
const fetchData = async (url: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    throw error; // Laissez le composant gérer l'erreur et la traduction
  }
};

const fetchApiData = async (endpoint: string, params?: Record<string, string>) => {
  const url = new URL(`${API_BASE_URL}/${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  try {
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

// Fonctions API spécifiques
const fetchAnneesAcademiques = () => fetchApiData('annees-academiques');

const fetchClasses = async (anneeAcademiqueId: number) => {
  const allClasses = await fetchApiData('classes');
  return allClasses.filter((cls: Classe) => cls.annee_scolaire_id === anneeAcademiqueId);
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number) => {
  const inscriptions = await fetchApiData('inscriptions', {
    classeId: classeId.toString(),
    anneeScolaireId: anneeScolaireId.toString()
  });
  return inscriptions
    .filter((inscription: any) => inscription.utilisateur?.role === 'eleve')
    .map((inscription: any) => ({
      id: inscription.utilisateur.id,
      nom: inscription.utilisateur.nom || 'Inconnu',
      prenom: inscription.utilisateur.prenom || '',
      classeId: inscription.classe.id,
      inscriptionId: inscription.id,
    }));
};

const fetchMatieresAndCoefficientsByClasse = async (classeId: number) => {
  const coefficientClasses = await fetchData(
    `${API_BASE_URL}/coefficientclasse?classeId=${classeId}`,
  );
  
  // Utilisez un Set pour éliminer les doublons
  const uniqueMatieres = Array.from(new Set(
    coefficientClasses
      .map((cc: any) => cc.matiere?.id || cc.matiere_id)
      .filter(Boolean)
  ));

  return {
    matieres: uniqueMatieres.map(id => {
      const found = coefficientClasses.find((cc: any) => 
        (cc.matiere?.id || cc.matiere_id) === id
      );
      return found?.matiere || { id, nom: 'Matière inconnue' };
    }),
    coefficients: coefficientClasses.map((cc: any) => ({
      id: cc.id,
      matiere_id: cc.matiere?.id || cc.matiere_id,
      classe_id: cc.classe_id,
      coefficient: cc.coefficient,
    }))
  };
};

const fetchTrimestresByAnneeAcademique = (anneeAcademiqueId: number) => 
  fetchApiData('trimestres', {
    anneeScolaireId: anneeAcademiqueId.toString()
  });

const fetchEvaluationsForClassAndTerm = async (classeId: number, trimestreId: number, anneeScolaireId: number) => {
  const data = await fetchApiData('evaluations', {
    classeId: classeId.toString(),
    trimestre: trimestreId.toString(),
    anneeScolaireId: anneeScolaireId.toString()
  });
  return data.map((evalItem: any) => ({
    id: evalItem.id,
    matiere_id: evalItem.matiere?.id || evalItem.matiere_id,
    matiere: evalItem.matiere,
    classe_id: evalItem.classe_id,
    professeur_id: evalItem.professeur_id,
    type: evalItem.type.toLowerCase().includes('devoir') ? 'Devoir' : 'Composition',
    date_eval: evalItem.date_eval,
    trimestre: evalItem.trimestre,
    annee_scolaire_id: evalItem.annee_scolaire_id,
    libelle: evalItem.type
  }));
};

const fetchNotesForEvaluations = async (evaluationIds: number[], etudiantId?: number) => {
  if (evaluationIds.length === 0) return [];
  const params: Record<string, string> = {
    evaluationIds: evaluationIds.join(',')
  };
  if (etudiantId) {
    params.etudiant_id = etudiantId.toString();
  }
  return fetchApiData('notes', params);
};

const fetchAbsencesForStudent = async (etudiantId: number, anneeScolaireId: number, dateDebut: string, dateFin: string) => {
  if (!etudiantId || !anneeScolaireId || !dateDebut || !dateFin) return [];
  return fetchApiData('absences', {
    etudiant_id: etudiantId.toString(),
    annee_scolaire_id: anneeScolaireId.toString(),
    date_debut: dateDebut,
    date_fin: dateFin
  });
};
const PrintableReport = React.forwardRef<
  HTMLDivElement,
  {
    report: BulletinEleve | null,
    establishmentInfo: { schoolName: string, address: string, phone?: string, website?: string },
    selectedClass: string,
    selectedTerm: string,
    selectedYear: string,
    dynamicEvaluationHeaders: string[],
    getMention: (m: number) => string
  }
>(({ report, establishmentInfo, selectedClass, selectedTerm, selectedYear, dynamicEvaluationHeaders, getMention }, ref) => {
  if (!report) return null;

  // Styles pour le mode paysage
  const pageStyle: React.CSSProperties = {
    width: '297mm', // Largeur de page A4 en paysage
    height: '210mm', // Hauteur de page A4 en paysage
    margin: '0 auto',
    padding: '4mm',
    boxSizing: 'border-box',
    fontFamily: "'Times New Roman', serif",
    fontSize: '10pt',
    lineHeight: 1.3,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10pt',
    borderBottom: '1pt solid #000',
    paddingBottom: '8pt'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    margin: '10pt 0',
    fontSize: '9pt'
  };

  const cellStyle: React.CSSProperties = {
    border: '1pt solid #000',
    padding: '3pt',
    textAlign: 'center'
  };

  const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: '#f2f2f2',
    fontWeight: 'bold'
  };

  return (
    <div ref={ref} style={pageStyle}>
      {/* En-tête */}
      <div style={headerStyle}>
        <div style={{ textAlign: 'left', width: '25%' }}>
          <div style={{ fontWeight: 'bold' }}>République Islamique de Mauritanie</div>
          <div>Ministère de l'Éducation Nationale</div>
          <div>Direction des Examens et Concours</div>
        </div>
        
        <div style={{ textAlign: 'center', width: '50%' }}>
          <div style={{ 
            fontWeight: 'bold', 
            fontSize: '14pt', 
            textDecoration: 'underline',
            marginBottom: '4pt'
          }}>
            BULLETIN DE NOTES
          </div>
          <div>Année Scolaire: <strong>{selectedYear}</strong></div>
          <div>Trimestre: <strong>{selectedTerm}</strong></div>
        </div>
        
        <div style={{ textAlign: 'right', width: '25%', direction: 'rtl' }}>
          <div style={{ fontWeight: 'bold' }}>الجمهورية الإسلامية الموريتانية</div>
          <div>وزارة التهذيب الوطني</div>
          <div>مديرية الامتحانات والمباريات</div>
        </div>
      </div>

      {/* Informations élève - version compacte pour paysage */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10pt',
        marginBottom: '10pt',
        fontSize: '10pt'
      }}>
        <div>
          <div><strong>Établissement:</strong> {establishmentInfo.schoolName}</div>
          <div><strong>Élève:</strong> {report.name}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><strong>Classe:</strong> {selectedClass}</div>
          <div>
            <strong>Absences:</strong>{" "}
            <span style={{ color: 'red' }}>{report.absencesNonJustifieesHeures ?? 0} h</span>
          </div>
        </div>
      </div>

      {/* Tableau des notes - version compacte */}
      <div style={{ overflow: 'hidden' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={{ ...headerCellStyle, width: '15%' }}>Matière</th>
              <th style={{ ...headerCellStyle, width: '5%' }}>Coef</th>
              
              {/* En-têtes dynamiques plus compacts */}
              {dynamicEvaluationHeaders
                .filter(header => header.toLowerCase().includes('devoir'))
                .map(header => (
                  <th key={header} style={{ ...headerCellStyle, width: '6%' }}>
                    {header.replace('Devoir', 'Devoir')}
                  </th>
                ))}
              
              {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                <th style={{ ...headerCellStyle, width: '6%' }}>Moy.Devoir*3</th>
              )}
              
              {dynamicEvaluationHeaders
                .filter(header => header.toLowerCase().includes('compo'))
                .map(header => (
                  <th key={header} style={{ ...headerCellStyle, width: '6%' }}>
                    {header.replace('Composition', 'Comp')}
                  </th>
                ))}
              
              <th style={{ ...headerCellStyle, width: '7%' }}>M.Matière</th>
              <th style={{ ...headerCellStyle, width: '15%' }}>Observation</th>
            </tr>
          </thead>
          <tbody>
            {report.notesParMatiere.map(matiere => (
              <tr key={matiere.matiere}>
                <td style={{ ...cellStyle, textAlign: 'left' }}>{matiere.matiere}</td>
                <td style={cellStyle}>{matiere.coefficient}</td>
                
                {dynamicEvaluationHeaders
                  .filter(header => header.toLowerCase().includes('devoir'))
                  .map(header => {
                    const note = matiere.notesEvaluations.find(n => n.libelle === header);
                    return (
                      <td key={`${matiere.matiere}-${header}`} style={cellStyle}>
                        {note ? note.note : "-"}
                      </td>
                    );
                  })}
                
                {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                  <td style={cellStyle}>
                    {matiere.moyenneDevoirsPonderee?.toFixed(2) || '-'}
                  </td>
                )}
                
                {dynamicEvaluationHeaders
                  .filter(header => header.toLowerCase().includes('compo'))
                  .map(header => {
                    const note = matiere.notesEvaluations.find(n => n.libelle === header);
                    return (
                      <td key={`${matiere.matiere}-${header}`} style={cellStyle}>
                        {note ? note.note : "-"}
                      </td>
                    );
                  })}
                
                <td style={{ ...cellStyle, fontWeight: 'bold' }}>
                  {matiere.moyenneMatiere.toFixed(2)}
                </td>
                <td style={cellStyle}></td>
              </tr>
            ))}
            
            {/* Ligne des totaux */}
            <tr style={{ fontWeight: 'bold' }}>
              <td style={cellStyle}>Totaux</td>
              <td style={cellStyle}>
                {report.notesParMatiere.reduce((sum, matiere) => sum + matiere.coefficient, 0)}
              </td>
              <td style={cellStyle} colSpan={dynamicEvaluationHeaders.length + 1}></td>
              <td style={cellStyle}>
                {report.notesParMatiere
                  .reduce((sum, matiere) => sum + (matiere.moyenneMatiere * matiere.coefficient), 0)
                  .toFixed(2)}
              </td>
              <td style={cellStyle}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Section inférieure avec appréciations et résultats */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10pt',
        marginTop: '20pt',
        alignItems: 'start'
      }}>
        {/* Appréciations */}
        <div style={{ 
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          border: '1pt solid #000',
          padding: '8pt',
                    height: '80%'

        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4pt' }}>
            Appréciation du Conseil de Classe:
          </div>
          <div style={{ fontStyle: 'italic' }}>{report.teacherComment}</div>
          <div style={{ textAlign: 'right', marginTop: '4pt', fontSize: '9pt' }}>
            Signature du Professeur Principal
          </div>
        </div>

        {/* Résultats finaux compacts */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          rowGap: '10pt',
          columnGap: '8pt'
        }}>
          {[
            { label: "Moyenne", value: `${report.avg}/20`, color: "blue" },
            { label: "Rang", value: report.rank, color: "black" },
            { label: "Mention", value: getMention(parseFloat(report.avg)), color: "darkblue" },
            { 
              label: "Décision", 
              value: parseFloat(report.avg) >= 10 ? "Admis(e)" : "Non Admis(e)", 
              color: parseFloat(report.avg) >= 10 ? "green" : "red" 
            }
          ].map((item, index) => (
            <div key={index} style={{ 
              border: '1pt solid #ddd',
              borderRadius: '4pt',
              padding: '6pt',
              textAlign: 'center'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '2pt', fontSize: '9pt' }}>{item.label}</div>
              <div style={{ 
                fontWeight: 'bold', 
                fontSize: '11pt', 
                color: item.color 
              }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pied de page compact */}
      <div style={{ 
        textAlign: 'center', 
        fontSize: '8pt',
        borderTop: '1pt solid #000',
        paddingTop: '6pt',
        marginTop: '30pt'
      }}>
        <div>Cachet et Signature de l'Administration</div>
        <div style={{ marginTop: '2pt' }}>
          {establishmentInfo.schoolName} - {establishmentInfo.address}
          {establishmentInfo.phone && ` - Tél: ${establishmentInfo.phone}`}
        </div>
      </div>
    </div>
  );
});

PrintableReport.displayName = 'PrintableReport';

// Composant principal
export function ReportManagement() {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  const { schoolName, address, phone, website } = useEstablishmentInfo();
  const getTranslatedTerm = (termName: string) => {
  switch(termName) {
    case 'Trimestre 1': return t.gradeManagement.term1;
    case 'Trimestre 2': return t.gradeManagement.term2;
    case 'Trimestre 3': return t.gradeManagement.term3;
    default: return termName;
  }
};
  // États
  const [anneesAcademiques, setAnneesAcademiques] = useState<AnneeAcademique[]>([]);
  const [selectedAnneeAcademiqueId, setSelectedAnneeAcademiqueId] = useState<string>('');
  const [classes, setClasses] = useState<Classe[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [trimestres, setTrimestres] = useState<Trimestre[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [coefficients, setCoefficients] = useState<CoefficientClasse[]>([]);
  const [allEvaluations, setAllEvaluations] = useState<Evaluation[]>([]);
  const [allNotes, setAllNotes] = useState<Note[]>([]);
  const [bulletins, setBulletins] = useState<BulletinEleve[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [previewOpen, setPreviewOpen] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<BulletinEleve | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [dynamicEvaluationHeaders, setDynamicEvaluationHeaders] = useState<string[]>([]);

  // Chargement initial des années académiques
  useEffect(() => {
    const loadAnneesAcademiques = async () => {
      const data = await fetchAnneesAcademiques();
      setAnneesAcademiques(data);
    };
    loadAnneesAcademiques();
  }, []);

  // Chargement des classes et trimestres quand l'année change
  useEffect(() => {
    const loadClassesAndTrimestres = async () => {
      const anneeId = parseInt(selectedAnneeAcademiqueId);
      if (!anneeId) return;

      setIsLoading(true);
      try {
        const [trimestresData, classesData] = await Promise.all([
          fetchTrimestresByAnneeAcademique(anneeId),
          fetchClasses(anneeId)
        ]);

        setTrimestres(trimestresData);
        setClasses(classesData);
        
        if (!trimestresData.some(t => t.id.toString() === selectedTermId)) {
          setSelectedTermId('');
        }
        if (!classesData.some(c => c.id.toString() === selectedClassId)) {
          setSelectedClassId('');
        }
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadClassesAndTrimestres();
  }, [selectedAnneeAcademiqueId]);

  // Chargement des élèves et matières quand la classe change
  useEffect(() => {
    const loadElevesAndMatieres = async () => {
      const classIdNum = parseInt(selectedClassId);
      const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
      if (!classIdNum || !anneeIdNum) return;

      setIsLoading(true);
      try {
        const [elevesData, matieresCoeffData] = await Promise.all([
          fetchElevesByClasse(classIdNum, anneeIdNum),
          fetchMatieresAndCoefficientsByClasse(classIdNum)
        ]);

        setEleves(elevesData);
        setMatieres(matieresCoeffData.matieres);
        setCoefficients(matieresCoeffData.coefficients);
      } catch (error) {
        console.error("Failed to load students or subjects:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadElevesAndMatieres();
  }, [selectedClassId, selectedAnneeAcademiqueId]);

  // Chargement des évaluations et notes quand le trimestre change
  useEffect(() => {
    const loadEvaluationsAndNotes = async () => {
      const classIdNum = parseInt(selectedClassId);
      const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
      const termIdNum = parseInt(selectedTermId);
      if (!classIdNum || !anneeIdNum || !termIdNum) return;

      setIsLoading(true);
      try {
        const evaluationsData = await fetchEvaluationsForClassAndTerm(classIdNum, termIdNum, anneeIdNum);
        setAllEvaluations(evaluationsData);

        // Générer les en-têtes dynamiques
        const devoirLabels = Array.from(
          new Set(
            evaluationsData
              .filter(e => e.type === 'Devoir')
              .map(e => e.libelle)
          )
        ) as string[];

        devoirLabels.sort((a, b) => {
          const numA = parseInt(String(a).replace(/Devoir\s*/i, '')) || 0;
          const numB = parseInt(String(b).replace(/Devoir\s*/i, '')) || 0;
          return numA - numB;
        });

        const compositionLabels = Array.from(
          new Set(
            evaluationsData
              .filter(e => e.type === 'Composition')
              .map(e => e.libelle)
          )
        ) as string[];

        compositionLabels.sort((a, b) => {
          const numA = parseInt(String(a).replace(/Composition\s*/i, '')) || 0;
          const numB = parseInt(String(b).replace(/Composition\s*/i, '')) || 0;
          return numA - numB;
        });

        setDynamicEvaluationHeaders([...devoirLabels, ...compositionLabels]);

        // Charger les notes
        const evaluationIds = evaluationsData.map(e => e.id);
        const notesData = await fetchNotesForEvaluations(evaluationIds);
        setAllNotes(notesData);
      } catch (error) {
        console.error("Failed to load evaluations or notes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvaluationsAndNotes();
  }, [selectedClassId, selectedTermId, selectedAnneeAcademiqueId]);

  // Génération des bulletins
  const generateBulletins = useCallback(async () => {
    const classIdNum = parseInt(selectedClassId);
    const anneeIdNum = parseInt(selectedAnneeAcademiqueId);
    const termIdNum = parseInt(selectedTermId);
    if (!classIdNum || !anneeIdNum || !termIdNum) return;

    setIsLoading(true);
    try {
      const currentTrimestre = trimestres.find(t => t.id === termIdNum);
      if (!currentTrimestre) return;

      const calculateDurationInHours = (heureDebutStr?: string, heureFinStr?: string): number => {
        if (!heureDebutStr || !heureFinStr) return 0;
        try {
          const [hD, mD] = heureDebutStr.split(':').map(Number);
          const [hF, mF] = heureFinStr.split(':').map(Number);
          const debutMinutes = hD * 60 + mD;
          const finMinutes = hF * 60 + mF;
          return finMinutes < debutMinutes ? 0 : (finMinutes - debutMinutes) / 60;
        } catch {
          return 0;
        }
      };

      const bulletinsPromises = eleves.map(async (eleve) => {
        let totalHeuresAbsenceNonJustifiees = 0;

        // Calculer les absences
        const absencesEleve = await fetchAbsencesForStudent(
          eleve.id, 
          anneeIdNum, 
          currentTrimestre.date_debut, 
          currentTrimestre.date_fin
        );
        
        absencesEleve.forEach(absence => {
          if (!absence.justification) {
            totalHeuresAbsenceNonJustifiees += calculateDurationInHours(absence.heure_debut, absence.heure_fin);
          }
        });

        // Générer les détails par matière
        const matieresDetails = await Promise.all(matieres.map(async (matiere) => {
          const coefficient = coefficients.find(c => c.matiere_id === matiere.id)?.coefficient || 1;
          const evaluationsForMatiere = allEvaluations.filter(e => e.matiere_id === matiere.id);
          const eleveNotesForMatiere = allNotes.filter(note =>
            note.etudiant.id === eleve.id &&
            evaluationsForMatiere.some(evalItem => evalItem.id === note.evaluation.id)
          );

          // Récupérer les notes pour chaque évaluation
          const notesEvaluations: EvaluationDetailBulletin[] = dynamicEvaluationHeaders.map(header => {
            const evalItem = evaluationsForMatiere.find(e => e.libelle === header);
            const note = eleveNotesForMatiere.find(n => n.evaluation.id === evalItem?.id);
            return {
              id: evalItem?.id || 0,
              type: evalItem?.type || (header.toLowerCase().includes('compo') ? 'Composition' : 'Devoir'),
              libelle: header,
              note: note ? note.note : '00'
            };
          });

          // Calculer la moyenne
          const devoirNotes = notesEvaluations
            .filter(n => n.type === 'Devoir' && typeof n.note === 'number')
            .map(n => n.note as number);
          
          const compositionNote = notesEvaluations
            .find(n => n.type === 'Composition' && typeof n.note === 'number')?.note as number | undefined;

          const avgDevoirs = devoirNotes.length > 0 ? 
            devoirNotes.reduce((sum, note) => sum + note, 0) / devoirNotes.length : 0;
          
          let moyenneMatiere = 0;
          if (devoirNotes.length > 0 && compositionNote !== undefined) {
            moyenneMatiere = (avgDevoirs * 3 + compositionNote) / 4;
          } else if (devoirNotes.length > 0) {
            moyenneMatiere = avgDevoirs;
          } else if (compositionNote !== undefined) {
            moyenneMatiere = compositionNote;
          }

          return {
            matiere: matiere.nom,
            coefficient,
            notesEvaluations,
            moyenneMatiere: parseFloat(moyenneMatiere.toFixed(2)),
            moyenneDevoirsPonderee: parseFloat((avgDevoirs * 3).toFixed(2)),
            appreciation: ""
          };
        }));

        // Calculer la moyenne générale
        const totalPoints = matieresDetails.reduce((sum, matiere) => 
          sum + (matiere.moyenneMatiere * matiere.coefficient), 0);
        const totalCoefficients = matieresDetails.reduce((sum, matiere) => 
          sum + matiere.coefficient, 0);
        const overallAvg = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

        return {
          id: eleve.id,
          name: `${eleve.prenom} ${eleve.nom}`,
          avg: parseFloat(overallAvg.toFixed(2)).toString(),
          rank: '', // Le classement sera calculé plus tard
          teacherComment: "",
          principalComment: "",
          notesParMatiere: matieresDetails,
          absencesNonJustifieesHeures: parseFloat(totalHeuresAbsenceNonJustifiees.toFixed(1)),
          totalElevesClasse: eleves.length
        };
      });

      const generatedBulletins = await Promise.all(bulletinsPromises);
      
      // Calculer le classement
      generatedBulletins.sort((a, b) => parseFloat(b.avg) - parseFloat(a.avg));
      generatedBulletins.forEach((bulletin, index) => {
        bulletin.rank = `${index + 1}/${generatedBulletins.length}`;
      });

      setBulletins(generatedBulletins);
    } catch (error) {
      console.error("Error generating bulletins:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedAnneeAcademiqueId, selectedTermId, eleves, matieres, coefficients, allEvaluations, allNotes, dynamicEvaluationHeaders, trimestres]);

  // Déclencher la génération des bulletins quand les données nécessaires sont disponibles
  useEffect(() => {
    generateBulletins();
  }, [generateBulletins]);

  const filteredBulletins = useMemo(() => {
    return bulletins.filter(bulletin =>
      bulletin.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
  }, [bulletins, debouncedSearchQuery]);

  const handlePreviewReport = (bulletin: BulletinEleve) => {
    setSelectedReport(bulletin);
    setPreviewOpen(true);
  };

  const printAllReports = () => {
    if (bulletins.length === 0) {
      toast({
        title: t.common.error,
        description: t.reports.noReportsToPrint,
        variant: "destructive",
      });
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      let allReportsHtml = '';
      bulletins.forEach((bulletin) => {
        const reportHtml = ReactDOMServer.renderToString(
          <PrintableReport
            report={bulletin}
            establishmentInfo={{ schoolName, address, phone, website }}
            selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
  selectedTerm={getTranslatedTerm(trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || '')}
            selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
            dynamicEvaluationHeaders={dynamicEvaluationHeaders}
            getMention={getMention}
          />
        );
        allReportsHtml += `<div class="page-break">${reportHtml}</div>`;
      });

      printWindow.document.write(`
        <html>
        <head>
          <title>${t.reports.title} - ${classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}</title>
          <style>
            @page {
              margin: 10px;
            }
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              ${isRTL ? 'direction: rtl;' : ''}
            }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body ${isRTL ? 'dir="rtl"' : ''}>
          ${allReportsHtml}
          <script>
            setTimeout(() => { window.print(); window.close(); }, 500);
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const exportPreviewedReport = () => {
    if (!selectedReport) return;
    toast({
      title: t.reports.exportPDF,
      description: t.reports.exportingReport.replace('{name}', selectedReport.name),
    });
  };

  const printPreviewedReport = () => {
    if (!selectedReport) return;
    window.print();
  };

  const getMention = (moyenne: number): string => {
    if (moyenne >= 16) return t.reportManagement.mentions.excellent;
    if (moyenne >= 14) return t.reportManagement.mentions.veryGood;
    if (moyenne >= 12) return t.reportManagement.mentions.good;
    if (moyenne >= 10) return t.reportManagement.mentions.fair;
    if (moyenne >= 8) return t.reportManagement.mentions.encouragement;
    return t.reportManagement.mentions.warning;
  };

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;

 const printReportFromRow = (bulletin: BulletinEleve) => {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bulletin scolaire - ${bulletin.name}</title>
        <meta charset="UTF-8">
        <style>
          @page {
            size: A4 landscape;
            margin: 15mm;
          }
          body {
            font-family: 'Times New Roman', serif;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .print-container {
            width: 297mm;
            height: 210mm;
          }
        </style>
      </head>
      <body>
        <div class="print-container">
          ${ReactDOMServer.renderToString(
            <PrintableReport
              report={bulletin}
              establishmentInfo={{ schoolName, address, phone, website }}
              selectedClass={classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}
              selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
              selectedYear={anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle || ''}
              dynamicEvaluationHeaders={dynamicEvaluationHeaders}
              getMention={getMention}
            />
          )}
        </div>
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 300);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};
 return (
  <div className="p-6 bg-gray-50 dark:bg-gray-900" dir={isRTL ? 'rtl' : 'ltr'}>
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 border-b pb-4">
      {t.reports.title}
    </h1>

      {/* Formulaire de sélection */}
      <Card className="mb-8 shadow-lg rounded-lg dark:border dark:border-gray-700">
  <CardHeader className="bg-blue-600 dark:bg-blue-800 text-white rounded-t-lg p-4">
    <CardTitle className="text-2xl font-bold text-white">
      {t.reports.selectionTitle}
    </CardTitle>
    <CardDescription className="text-blue-100 dark:text-blue-200">
      {t.reports.selectionDescription}
    </CardDescription>
  </CardHeader>
  <CardContent className="p-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sélecteur d'année scolaire */}
            <div className="space-y-2">
             <label htmlFor="annee-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t.common.schoolYear}
        </label>
              <Select 
                onValueChange={setSelectedAnneeAcademiqueId} 
                value={selectedAnneeAcademiqueId}
              >
                  <SelectTrigger id="annee-select" className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
            <SelectValue placeholder={t.common.selectAYear} />
          </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {anneesAcademiques.map((annee) => (
                     <SelectItem key={annee.id} value={annee.id.toString()} className="dark:hover:bg-gray-700">
                {annee.libelle}
              </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de classe */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.class}
              </label>
              <Select
                onValueChange={setSelectedClassId}
                value={selectedClassId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
                  <SelectValue placeholder={t.common.selectAClass} />
                </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()} className="dark:hover:bg-gray-700">
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de trimestre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t.common.trimester}
              </label>
              <Select
                onValueChange={setSelectedTermId}
                value={selectedTermId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 dark:border-gray-600 focus:border-blue-500 rounded-md dark:bg-gray-800 dark:text-white">
                  <SelectValue placeholder={t.common.selectATrimester} />
                </SelectTrigger>
          <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                  {trimestres.map((trimestre) => (
                    <SelectItem key={trimestre.id} value={trimestre.id.toString()} className="dark:hover:bg-gray-700">
  {getTranslatedTerm(trimestre.nom)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Résultats */}
      {isFormComplete ? (
        <div className="space-y-8">
<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">            <Button
              onClick={printAllReports}
              disabled={isLoading || bulletins.length === 0}
        className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white shadow-md px-6 py-3 text-base rounded-md"
            >
              <Printer className="mr-3 h-5 w-5" />
              {t.reports.printAllReports}
            </Button>

            <div className="relative w-full md:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500" />
              <Input
                placeholder={t.reports.searchStudent}
          className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

    <Card className="shadow-lg rounded-lg dark:border dark:border-gray-700">
            <CardContent className="p-0">
              {isLoading ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-300 mx-auto mb-4"></div>
                  {t.common.loading}
                </div>
              ) : filteredBulletins.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12 text-lg">
                  {searchQuery ? (
                    <p>{t.reports.noStudentFound}</p>
                  ) : (
                    <>
                      <p>{t.reports.noStudentOrGrade}</p>
                      <p className="mt-2 text-sm">{t.reports.noStudentOrGradeHint}</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Vue desktop */}
            <div className="hidden lg:block rounded-lg dark:bg-gray-800" style={{ maxHeight: "40vh", overflowY: "auto", overflowX: "auto" }}>
              <Table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <TableHeader className="bg-gray-100 dark:bg-gray-700">
                        <TableRow>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.student}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.reportManagement.overallAverage}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.reportManagement.rank}
                          </TableHead>
                    <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.status.general}
                          </TableHead>
                          <TableHead className="px-6 py-3 text-right text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                            {t.common.actions}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                <TableBody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {filteredBulletins.map((bulletin) => (
                    <TableRow key={bulletin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.name}
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.avg}/20
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              {bulletin.rank}
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              <Badge className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                                {t.reports.generated}
                              </Badge>
                            </TableCell>
                      <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewReport(bulletin)}
                                  className="text-blue-600 hover:bg-blue-50 rounded-md"
                                >
                                  <Eye className="h-4 w-4 mr-1" /> {t.reports.preview}
                                </Button>
                                <Button 
                                  onClick={() => printReportFromRow(bulletin)}
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Printer className="h-4 w-4 mr-1" /> {t.common.print}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Vue mobile */}
                  <div
                    className="block lg:hidden space-y-2 p-2 bg-white rounded-md"
                    style={{
                      height: 'calc(81vh - 180px)',
                      overflowY: 'auto',
                    }}
                  >
                    {filteredBulletins.map((bulletin) => (
                      <Card key={bulletin.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
                            {bulletin.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm border-t border-b py-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.reportManagement.overallAverage}:
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                              {bulletin.avg}/20
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.reportManagement.rank}:
                            </span>
                            <span className="text-gray-800 dark:text-gray-100">{bulletin.rank}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-gray-600 dark:text-gray-300">
                              {t.common.status.general}:
                            </span>
                            <Badge className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                              {t.reports.generated}
                            </Badge>
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreviewReport(bulletin)}
                            className="text-blue-600 hover:bg-blue-50 rounded-md flex-1 justify-center"
                          >
                            <Eye className="h-4 w-4 mr-1" /> {t.reports.preview}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => printReportFromRow(bulletin)}
                            className="text-red-600 hover:bg-red-50 rounded-md"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
  <div className="bg-white dark:bg-gray-800 rounded-lg p-10 text-center shadow-lg border border-gray-200 dark:border-gray-700">
    <p className="text-gray-600 dark:text-gray-300 text-lg font-medium">
            {t.reports.selectPrompt}
          </p>
    <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            {t.reports.useDropdowns}
          </p>
        </div>
      )}

      {/* Dialogue de prévisualisation */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
<DialogContent className="max-w-6xl w-full p-0 rounded-lg overflow-hidden h-[calc(100vh-2rem)] print:h-[297mm] print:max-h-[297mm] print:rounded-none print:shadow-none print:border-none dark:bg-gray-900">
          {/* Contenu imprimable */}
          {selectedReport && (
            <div 
              id="bulletin-preview-content-area" 
      className="bg-white dark:bg-gray-800 h-full overflow-y-auto px-8 pt-8 pb-8 print:p-[8mm] print:overflow-visible print:h-auto print:border print:border-gray-300 print:shadow-md print:rounded-md"
              dir="ltr"
            >
              {/* En-tête */}
              <div className="grid grid-cols-3 items-center gap-4 text-xs mb-6 print:mb-4">
                <div className="text-left">
                  <p>{t.reportManagement.republic}</p>
                  <p>{t.reportManagement.educationMinistry}</p>
                  <p>{t.reportManagement.examsDirection}</p>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-blue-800 mb-1">
                    {t.reportManagement.reportTitle}
                  </h2>
                  <p className="font-semibold text-sm">
                    {t.reportManagement.schoolYear}:{" "}
                    <span className="text-blue-700">
                      {anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}
                    </span>
                  </p>
                  <p className="font-semibold text-sm">
                    {t.reportManagement.term}:{" "}
                    <span className="text-blue-700">
                      {trimestres.find(t => t.id === parseInt(selectedTermId))?.nom}
                    </span>
                  </p>
                </div>
                <div className="text-right text-xs" dir="rtl">
                  <p>{t.reportManagement.republicAr}</p>
                  <p>{t.reportManagement.educationMinistryAr}</p>
                  <p>{t.reportManagement.examsDirectionAr}</p>
                </div>
              </div>

              {/* Info élève */}
              <div className="mb-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <p><strong>{t.reportManagement.establishment}:</strong> {schoolName}</p>
                    <p><strong>{t.common.student}:</strong> {selectedReport.name}</p>
                    <p><strong>{t.reportManagement.studentId}:</strong> 123456</p>
                  </div>
                  <div className="text-right md:pl-8">
                    <p><strong>{t.common.class}:</strong> {classes.find(c => c.id === parseInt(selectedClassId))?.nom}</p>
                    <p><strong>{t.reportManagement.studentsCount}:</strong> {selectedReport.totalElevesClasse}</p>
                    <p>
                      <strong>{t.reportManagement.unjustifiedAbsences}:</strong>{" "}
                      <span className="text-red-600">{selectedReport.absencesNonJustifieesHeures ?? 0} {t.common.hours}</span>
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-2 text-right text-xs">
                  {t.reportManagement.printDate}: {new Date().toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
                </div>
              </div>

              {/* Tableau des notes */}
              <div className="mb-6 overflow-x-auto text-xs print:text-xs">
                <Table className="w-full border border-gray-300 print:border print:border-gray-400 print:border-collapse">
                  <TableHeader className="bg-blue-100 print:bg-gray-100">
                    <TableRow>
                      <TableHead className="min-w-[150px]">
                        {t.reportManagement.subject}<br />
                        <span className="text-sm">{t.reportManagement.subjectAr}</span>
                      </TableHead>
                      <TableHead className="text-center">
                        {t.reportManagement.coefficient}<br />
                        <span className="text-sm">{t.reportManagement.coefficientAr}</span>
                      </TableHead>
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center">
                            {header}<br />
                            <span className="text-sm">
                              {header.toLowerCase().includes('devoir') ? t.reportManagement.testAr : ''}
                            </span>
                          </TableHead>
                        ))}
                      
                      {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                        <TableHead key="moy-dev-pond-header" className="text-center">
                          {t.reportManagement.weightedTestAvg}<br />
                          <span className="text-sm">{t.reportManagement.weightedTestAvgAr}</span>
                        </TableHead>
                      )}
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center min-w-[120px]">
                            {header.toLowerCase().startsWith('compo')
                              ? `${t.reportManagement.exam} ${header.replace(/composition\s*/i, '')}`
                              : header}
                            <br />
                            {header.toLowerCase().startsWith('compo')
                                ? `${t.reportManagement.examAr} ${header.replace(/composition\s*/i, '')}`
                                : ''}
                          </TableHead>
                        ))}
                      
                      <TableHead className="text-center">
                        {t.reportManagement.subjectAvg}<br />
                        <span className="text-sm">{t.reportManagement.subjectAvgAr}</span>
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        {t.reportManagement.observation}<br />
                        <span className="text-sm">{t.reportManagement.observationAr}</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {selectedReport.notesParMatiere.map(matiere => (
                      <TableRow key={matiere.matiere} className="even:bg-gray-50 print:even:bg-white">
                        <TableCell>{matiere.matiere}</TableCell>
                        <TableCell className="text-center">{matiere.coefficient}</TableCell>
                        {dynamicEvaluationHeaders
                          .filter(header => header.toLowerCase().includes('devoir'))
                          .map(header => {
                            const note = matiere.notesEvaluations.find(n => n.libelle === header);
                            return (
                              <TableCell key={`${matiere.matiere}-${header}-devoir`} className="text-center">
                                {note ? note.note : "00"}
                              </TableCell>
                            );
                          })}
                        
                        {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                          <TableCell key={`${matiere.matiere}-moy-dev-pond`} className="text-center">
                            {matiere.moyenneDevoirsPonderee !== undefined ? matiere.moyenneDevoirsPonderee.toFixed(2) : '-'}
                          </TableCell>
                        )}
                        
                        {dynamicEvaluationHeaders
                          .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                          .map(header => {
                            const note = matiere.notesEvaluations.find(n => n.libelle === header);
                            return (
                              <TableCell key={`${matiere.matiere}-${header}-compo`} className="text-center">
                                {note ? note.note : "00"}
                              </TableCell>
                            );
                          })}

                        <TableCell className="text-center font-bold">{matiere.moyenneMatiere.toFixed(2)}</TableCell>
                        <TableCell className="observation-column" style={{ textAlign: isRTL ? 'right' : 'left', paddingLeft: '16px' }}></TableCell>
                      </TableRow>
                    ))}

                    {/* Ligne des totaux */}
                    <TableRow className="bg-gray-50 font-bold print:bg-gray-100">
                      <TableCell>{t.reportManagement.totals}</TableCell>
                      <TableCell className="text-center">
                        {selectedReport.notesParMatiere.reduce((sum, matiere) => sum + matiere.coefficient, 0).toFixed(0)}
                      </TableCell>
                      <TableCell colSpan={dynamicEvaluationHeaders.length + 1}></TableCell>
                      <TableCell className="text-center">
                        {selectedReport.notesParMatiere
                          .reduce((sum, matiere) => sum + (matiere.moyenneMatiere * matiere.coefficient), 0)
                          .toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Observations & Résultats */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm print:text-sm">
                <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
                  <h3 className="font-bold mb-2">{t.reportManagement.classCouncilAppreciation}</h3>
                  <p className="italic">{selectedReport.teacherComment}</p>
                  <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t.reportManagement.teacherSignature}
                  </p>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
                  <h3 className="font-bold mb-2">{t.reportManagement.directorObservations}</h3>
                  <p className="italic">{selectedReport.principalComment}</p>
                  <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                    {t.reportManagement.directorSignature}
                  </p>
                </div>
              </div>

              {/* Résultats finaux */}
              <div className="mb-6 text-center grid grid-cols-2 md:grid-cols-4 gap-6 print:text-sm bg-gray-50 p-5 rounded-lg shadow-md">
                {[{
                  label: t.reportManagement.overallAverage,
                  value: `${selectedReport.avg}/20`,
                  textColor: "text-blue-700"
                }, {
                  label: t.reportManagement.rank,
                  value: selectedReport.rank,
                  textColor: "text-gray-900"
                }, {
                  label: t.reportManagement.mention,
                  value: getMention(parseFloat(selectedReport.avg)),
                  textColor: "text-indigo-600"
                }, {
                  label: t.reportManagement.decision,
                  value: parseFloat(selectedReport.avg) >= 10 ? t.reportManagement.passed : t.reportManagement.failed,
                  textColor: parseFloat(selectedReport.avg) >= 10 ? "text-green-600" : "text-red-600"
                }].map(({label, value, textColor}) => (
                  <div key={label} className="flex flex-col items-center">
                    <p className="font-semibold text-gray-700 mb-1 uppercase tracking-wide">{label}</p>
                    <p className={`text-2xl font-extrabold ${textColor}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Pied de page */}
              <div className="text-center text-xs text-gray-500 pt-2 pb-6 print:pb-0 print:text-xs">
                <p className="mt-2">{t.reportManagement.adminStamp}</p>
                <p className="mt-2">
                  {schoolName} - {address}
                  {phone && ` - ${t.common.phone}: ${phone}`}
                  {website && ` - ${t.common.website}: ${website}`}
                </p>
              </div>
            </div>
          )}

          {/* Actions non imprimables */}
  <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 flex justify-end gap-4 rounded-b-lg no-print">
    <Button variant="outline" onClick={() => setPreviewOpen(false)} className="dark:border-gray-600 dark:text-white">
              {t.common.close}
            </Button>
            <Button 
              onClick={exportPreviewedReport} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileDown className="mr-2 h-4 w-4" /> {t.reports.exportPDF}
            </Button>
            <Button 
              onClick={printPreviewedReport} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" /> {t.common.print}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}