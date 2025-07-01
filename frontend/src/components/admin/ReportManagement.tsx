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

// Configuration API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE_URL = `${API_URL}/api`;

// Fonctions API optimisées
const fetchData = async (url: string, errorMessage: string) => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    toast({
      title: "Erreur de chargement",
      description: errorMessage,
      variant: "destructive"
    });
    return [];
  }
};

const fetchAnneesAcademiques = () => fetchData(
  `${API_BASE_URL}/annees-academiques`,
  "Impossible de charger les années académiques."
);

const fetchClasses = async (anneeAcademiqueId: number) => {
  const allClasses = await fetchData(
    `${API_BASE_URL}/classes`,
    "Impossible de charger les classes."
  );
  return allClasses.filter((cls: Classe) => cls.annee_scolaire_id === anneeAcademiqueId);
};

const fetchElevesByClasse = async (classeId: number, anneeScolaireId: number) => {
  const inscriptions = await fetchData(
    `${API_BASE_URL}/inscriptions?classeId=${classeId}&anneeScolaireId=${anneeScolaireId}`,
    "Impossible de charger les élèves."
  );
  return inscriptions
    .filter((inscription: any) => inscription.utilisateur?.role === 'eleve')
    .map((inscription: any) => ({
      id: inscription.utilisateur.id,
      nom: inscription.utilisateur.nom || 'Nom Inconnu',
      prenom: inscription.utilisateur.prenom || '',
      classeId: inscription.classe.id,
      inscriptionId: inscription.id,
    }));
};

const fetchMatieresAndCoefficientsByClasse = async (classeId: number) => {
  const coefficientClasses = await fetchData(
    `${API_BASE_URL}/coefficientclasse?classeId=${classeId}`,
    "Impossible de charger les matières et coefficients."
  );
  return {
    matieres: coefficientClasses.map((cc: any) => cc.matiere).filter(Boolean),
    coefficients: coefficientClasses.map((cc: any) => ({
      id: cc.id,
      matiere_id: cc.matiere?.id || cc.matiere_id,
      classe_id: cc.classe_id,
      coefficient: cc.coefficient,
    }))
  };
};

const fetchTrimestresByAnneeAcademique = (anneeAcademiqueId: number) => fetchData(
  `${API_BASE_URL}/trimestres?anneeScolaireId=${anneeAcademiqueId}`,
  "Impossible de charger les trimestres."
);

const fetchEvaluationsForClassAndTerm = async (classeId: number, trimestreId: number, anneeScolaireId: number) => {
  const data = await fetchData(
    `${API_BASE_URL}/evaluations?classeId=${classeId}&trimestre=${trimestreId}&anneeScolaireId=${anneeScolaireId}`,
    "Impossible de charger les évaluations."
  );
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
  let url = `${API_BASE_URL}/notes?evaluationIds=${evaluationIds.join(',')}`;
  if (etudiantId) url += `&etudiant_id=${etudiantId}`;
  return fetchData(url, "Impossible de charger les notes.");
};

const fetchAbsencesForStudent = async (etudiantId: number, anneeScolaireId: number, dateDebut: string, dateFin: string) => {
  if (!etudiantId || !anneeScolaireId || !dateDebut || !dateFin) return [];
  const params = new URLSearchParams({
    etudiant_id: etudiantId.toString(),
    annee_scolaire_id: anneeScolaireId.toString(),
    date_debut: dateDebut,
    date_fin: dateFin,
  });
  return fetchData(
    `${API_BASE_URL}/absences?${params.toString()}`,
    "Impossible de charger les absences."
  );
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
  return (
    <div ref={ref}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
          <div>
            <div>République Islamique de Mauritanie</div>
            <div>Ministère de l'Éducation Nationale</div>
            <div>Direction des Examens et Concours</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 4 }}>BULLETIN DE NOTES</div>
            <div>Année Scolaire : <span style={{ color: '#2563eb' }}>{selectedYear}</span></div>
            <div>Trimestre : <span style={{ color: '#2563eb' }}>{selectedTerm}</span></div>
          </div>
          <div style={{ textAlign: 'right', direction: 'rtl' }}>
            <div>الجمهورية الإسلامية الموريتانية</div>
            <div>وزارة التهذيب الوطني</div>
            <div>مديرية الامتحانات والمباريات</div>
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 16, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div><strong>Établissement:</strong> {establishmentInfo.schoolName}</div>
            <div><strong>Élève:</strong> {report.name}</div>
            <div><strong>Matricule:</strong> 123456</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div><strong>Classe:</strong> {selectedClass}</div>
            <div><strong>Nombre d'élèves:</strong> {report.totalElevesClasse}</div>
            <div>
              <strong>Absences (non justifiées):</strong>{" "}
              <span style={{ color: '#dc2626' }}>{report.absencesNonJustifieesHeures ?? 0} h</span>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #ccc', paddingTop: 4, textAlign: 'right', fontSize: 11, marginTop: 8 }}>
          Date d'édition: {new Date().toLocaleDateString("fr-FR")}
        </div>
      </div>
      {/* Tableau des notes */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16, fontSize: 12 }}>
  <thead>
    <tr>
      <th style={{ border: '1px solid #ddd', padding: 6, width: 150 }}>Matière</th>
      <th style={{ border: '1px solid #ddd', padding: 6 }}>Coeff</th>
      {dynamicEvaluationHeaders
        .filter(header => header.toLowerCase().includes('devoir'))
        .map(header => (
          <th key={header} style={{ border: '1px solid #ddd', padding: 6 }}>{header}</th>
        ))}
      {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
        <th style={{ border: '1px solid #ddd', padding: 6 }}>Moy. devoir *3</th>
      )}
      {dynamicEvaluationHeaders
        .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
        .map(header => (
          <th key={header} style={{ border: '1px solid #ddd', padding: 6 }}>{header}</th>
        ))}
      <th style={{ border: '1px solid #ddd', padding: 6 }}>Moy. Matière</th>
      <th style={{ border: '1px solid #ddd', padding: 6, width: 220 }}>Observation</th>
    </tr>
  </thead>
  <tbody>
    {report.notesParMatiere.map(matiere => (
      <tr key={matiere.matiere}>
        <td style={{ border: '1px solid #ddd', padding: 6, width: 60 }}>{matiere.matiere}</td>
        <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>{matiere.coefficient}</td>
        {dynamicEvaluationHeaders
          .filter(header => header.toLowerCase().includes('devoir'))
          .map(header => {
            const note = matiere.notesEvaluations.find(n => n.libelle === header);
            return (
              <td key={`${matiere.matiere}-${header}-devoir`} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                {note ? note.note : "00"}
              </td>
            );
          })}
        {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
          <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
            {matiere.moyenneDevoirsPonderee !== undefined ? matiere.moyenneDevoirsPonderee.toFixed(2) : '-'}
          </td>
        )}
        {dynamicEvaluationHeaders
          .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
          .map(header => {
            const note = matiere.notesEvaluations.find(n => n.libelle === header);
            return (
              <td key={`${matiere.matiere}-${header}-compo`} style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
                {note ? note.note : "00"}
              </td>
            );
          })}
        <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center', fontWeight: 'bold' }}>{matiere.moyenneMatiere.toFixed(2)}</td>
        <td style={{ border: '1px solid #ddd', padding: 6, width: 220 }}></td>
      </tr>
    ))}
    {/* Ligne des totaux */}
    <tr style={{ fontWeight: 'bold', background: '#f9fafb' }}>
      <td style={{ border: '1px solid #ddd', padding: 6, width: 60 }}>Totaux</td>
      <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
        {report.notesParMatiere.reduce((sum, matiere) => sum + matiere.coefficient, 0).toFixed(0)}
      </td>
      <td style={{ border: '1px solid #ddd', padding: 6 }} colSpan={dynamicEvaluationHeaders.length + 1}></td>
      <td style={{ border: '1px solid #ddd', padding: 6, textAlign: 'center' }}>
        {report.notesParMatiere.reduce((sum, matiere) => sum + (matiere.moyenneMatiere * matiere.coefficient), 0).toFixed(2)}
      </td>
      <td style={{ border: '1px solid #ddd', padding: 6, width: 220 }}></td>
    </tr>
  </tbody>
</table>
      {/* Observations */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{
  flex: 1,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  minHeight: 80,
  whiteSpace: 'pre-line',
  wordBreak: 'break-word'
}}>
  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Appréciation du Conseil de Classe</div>
  <div style={{ fontStyle: 'italic', minHeight: 40 }}>{report.teacherComment}</div>
  <div style={{ textAlign: 'right', fontSize: 11, marginTop: 12 }}>Signature du Professeur Principal</div>
</div>
<div style={{
  flex: 1,
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: 12,
  minHeight: 80,
  whiteSpace: 'pre-line',
  wordBreak: 'break-word'
}}>
  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>Observations du Directeur</div>
  <div style={{ fontStyle: 'italic', minHeight: 40 }}>{report.principalComment}</div>
  <div style={{ textAlign: 'right', fontSize: 11, marginTop: 12 }}>Signature du Directeur</div>
</div>
      </div>
      {/* Résultats finaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, background: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 16 }}>
        {[{
          label: "Moyenne Générale",
          value: `${report.avg}/20`,
          color: "#2563eb"
        }, {
          label: "Rang",
          value: report.rank,
          color: "#111827"
        }, {
          label: "Mention",
          value: getMention(parseFloat(report.avg)),
          color: "#4f46e5"
        }, {
          label: "Décision",
          value: parseFloat(report.avg) >= 10 ? "Admis(e)" : "Non Admis(e)",
          color: parseFloat(report.avg) >= 10 ? "#16a34a" : "#dc2626"
        }].map(({ label, value, color }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{label}</div>
            <div style={{ fontWeight: 'bold', fontSize: 18, color }}>{value}</div>
          </div>
        ))}
      </div>
      {/* Pied de page */}
      <div style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', paddingTop: 8 }}>
        <div style={{ marginTop: 8 }}>Cachet et Signature de l'Administration</div>
        <div style={{ marginTop: 8 }}>
          {establishmentInfo.schoolName} - {establishmentInfo.address}
          {establishmentInfo.phone && ` - Tél: ${establishmentInfo.phone}`}
          {establishmentInfo.website && ` - Site: ${establishmentInfo.website}`}
        </div>
      </div>
    </div>
  );
});
PrintableReport.displayName = 'PrintableReport';
// Composant principal
export function ReportManagement() {
  const { schoolName, address, phone, website } = useEstablishmentInfo();
  
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
        title: "Action impossible",
        description: "Aucun bulletin à imprimer pour la sélection actuelle.",
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
            selectedTerm={trimestres.find(t => t.id === parseInt(selectedTermId))?.nom || ''}
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
          <title>Bulletins - ${classes.find(c => c.id === parseInt(selectedClassId))?.nom || ''}</title>
          <style>
            @page {
              margin: 10px; /* Applique une marge uniforme sur chaque page imprimée */
            }
            body { font-family: Arial, sans-serif; margin: 0; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background-color: #f2f2f2; }
            @media print {
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
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
      title: "Export en PDF",
      description: `Export du bulletin de ${selectedReport.name}.`,
    });
  };

  const printPreviewedReport = () => {
    if (!selectedReport) return;
    window.print();
  };

  const getMention = (moyenne: number): string => {
    if (moyenne >= 16) return "Félicitations";
    if (moyenne >= 14) return "Très Bien";
    if (moyenne >= 12) return "Bien";
    if (moyenne >= 10) return "Assez Bien";
    if (moyenne >= 8) return "Encouragements";
    return "Avertissement";
  };

  const isFormComplete = selectedAnneeAcademiqueId && selectedClassId && selectedTermId;
const printReportFromRow = (bulletin: BulletinEleve) => {
  setSelectedReport(bulletin);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
      <head>
        <title>Bulletin scolaire - ${bulletin.name}</title>
        <style>
          @page {
            margin: 10px;
          }
          body { font-family: Arial, sans-serif; margin: 0; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f2f2f2; }
          @media print {
            .page-break { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <div>
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
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }
};
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-6 border-b pb-4">Gestion des Bulletins Scolaires</h1>

      {/* Formulaire de sélection */}
      <Card className="mb-8 shadow-lg rounded-lg">
        <CardHeader className="bg-blue-600 text-white rounded-t-lg p-4">
          <CardTitle className="text-2xl font-bold">Sélection des Critères</CardTitle>
          <CardDescription className="text-blue-100">
            Choisissez l'année scolaire, la classe et le trimestre pour générer les bulletins.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sélecteur d'année scolaire */}
            <div className="space-y-2">
              <label htmlFor="annee-select" className="text-sm font-medium text-gray-700">
                Année Scolaire
              </label>
              <Select 
                onValueChange={setSelectedAnneeAcademiqueId} 
                value={selectedAnneeAcademiqueId}
              >
                <SelectTrigger id="annee-select" className="border-gray-300 focus:border-blue-500 rounded-md">
                  <SelectValue placeholder="Sélectionner une année" />
                </SelectTrigger>
                <SelectContent>
                  {anneesAcademiques.map((annee) => (
                    <SelectItem key={annee.id} value={annee.id.toString()}>
                      {annee.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de classe */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Classe</label>
              <Select
                onValueChange={setSelectedClassId}
                value={selectedClassId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 rounded-md">
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id.toString()}>
                      {cls.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sélecteur de trimestre */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Trimestre</label>
              <Select
                onValueChange={setSelectedTermId}
                value={selectedTermId}
                disabled={!selectedAnneeAcademiqueId || isLoading}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 rounded-md">
                  <SelectValue placeholder="Sélectionner un trimestre" />
                </SelectTrigger>
                <SelectContent>
                  {trimestres.map((trimestre) => (
                    <SelectItem key={trimestre.id} value={trimestre.id.toString()}>
                      {trimestre.nom}
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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Button
              onClick={printAllReports}
              disabled={isLoading || bulletins.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white shadow-md px-6 py-3 text-base rounded-md"
            >
              <Printer className="mr-3 h-5 w-5" />
              Imprimer tous les bulletins
            </Button>

            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Rechercher un élève..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <Card className="shadow-lg rounded-lg">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="text-center text-gray-500 py-12 text-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  Chargement des données...
                </div>
              ) : filteredBulletins.length === 0 ? (
                <div className="text-center text-gray-500 py-12 text-lg">
                  {searchQuery ? (
                    <p>Aucun élève correspondant à votre recherche.</p>
                  ) : (
                    <>
                      <p>Aucun élève trouvé ou aucune évaluation saisie.</p>
                      <p className="mt-2 text-sm">Vérifiez les données d'inscriptions ou les évaluations.</p>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Vue desktop */}
                  <div className="hidden lg:block rounded-lg" style={{ maxHeight: "40vh", overflowY: "auto", overflowX: "auto" }}>
                    <Table className="min-w-full divide-y divide-gray-200">
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Élève
                          </TableHead>
                          <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Moyenne
                          </TableHead>
                          <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Classement
                          </TableHead>
                          <TableHead className="px-6 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">
                            État
                          </TableHead>
                          <TableHead className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                            Actions
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="bg-white divide-y divide-gray-200">
                        {filteredBulletins.map((bulletin) => (
                          <TableRow key={bulletin.id} className="hover:bg-gray-50 transition-colors duration-150">
                            <TableCell className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {bulletin.name}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-center text-gray-700 font-semibold text-base">
                              {bulletin.avg}/20
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-center text-gray-700">
                              {bulletin.rank}
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-center">
                              <Badge className="bg-green-500 text-white text-xs font-medium px-2.5 py-0.5 rounded-full">
                                Généré
                              </Badge>
                            </TableCell>
                            <TableCell className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewReport(bulletin)}
                                  className="text-blue-600 hover:bg-blue-50 rounded-md"
                                >
                                  <Eye className="h-4 w-4 mr-1" /> Prévisualiser
                                </Button>
                               
<Button onClick={() => printReportFromRow(bulletin)}                                  variant="outline"
                                  size="sm"
                                  
                                  className="text-red-600 hover:bg-red-50 rounded-md"
                                >
                                  <Printer className="h-4 w-4 mr-1" /> Imprimer
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
    height: 'calc(81vh - 180px)', // ajuste selon la hauteur de ton header/filtre
    overflowY: 'auto',
  }}
>  {filteredBulletins.map((bulletin) => (
    <Card key={bulletin.id} className="bg-white dark:bg-gray-800 shadow-md rounded-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold text-blue-700 dark:text-blue-300">
          {bulletin.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm border-t border-b py-3">
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600 dark:text-gray-300">Moyenne:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            {bulletin.avg}/20
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600 dark:text-gray-300">Classement:</span>
          <span className="text-gray-800 dark:text-gray-100">{bulletin.rank}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-medium text-gray-600 dark:text-gray-300">État:</span>
          <Badge className="bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Généré
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
          <Eye className="h-4 w-4 mr-1" /> Prévisualiser
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
        <div className="bg-white rounded-lg p-10 text-center shadow-lg border border-gray-200">
          <p className="text-gray-600 text-lg font-medium">
            Veuillez sélectionner une année scolaire, une classe et un trimestre pour consulter les bulletins.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Utilisez les menus déroulants ci-dessus pour commencer.
          </p>
        </div>
      )}

      {/* Dialogue de prévisualisation */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-6xl w-full p-0 rounded-lg overflow-hidden h-[calc(100vh-2rem)] print:h-[297mm] print:max-h-[297mm] print:rounded-none print:shadow-none print:border-none">
          {/* Contenu imprimable */}
          {selectedReport && (
            <div id="bulletin-preview-content-area" className="bg-white h-full overflow-y-auto px-8 pt-8 pb-8 print:p-[8mm] print:overflow-visible print:h-auto print:border print:border-gray-300 print:shadow-md print:rounded-md">
              {/* En-tête - Ajout de items-center pour un meilleur alignement vertical */}
              <div className="grid grid-cols-3 items-center gap-4 text-xs mb-6 print:mb-4">
                <div className="text-left">
                  <p>République Islamique de Mauritanie</p>
                  <p>Ministère de l'Éducation Nationale</p>
                  <p>Direction des Examens et Concours</p>
                </div>
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-blue-800 mb-1">BULLETIN DE NOTES</h2>
                  <p className="font-semibold text-sm">
                    Année Scolaire:{" "}
                    <span className="text-blue-700">
                      {anneesAcademiques.find(a => a.id === parseInt(selectedAnneeAcademiqueId))?.libelle}
                    </span>
                  </p>
                  <p className="font-semibold text-sm">
                    Trimestre:{" "}
                    <span className="text-blue-700">
                      {trimestres.find(t => t.id === parseInt(selectedTermId))?.nom}
                    </span>
                  </p>
                </div>
                <div className="text-right text-xs" dir="rtl">
                  <p>الجمهورية الإسلامية الموريتانية</p>
                  <p>وزارة التهذيب الوطني</p>
                  <p>مديرية الامتحانات والمباريات</p>
                </div>
              </div>

              {/* Info élève */}
              <div className="mb-6 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                  <div>
                    <p><strong>Établissement:</strong> {schoolName}</p>
                    <p><strong>Élève:</strong> {selectedReport.name}</p>
                    <p><strong>Matricule:</strong> 123456</p>
                  </div>
                  <div className="text-right md:pl-8">
                    <p><strong>Classe:</strong> {classes.find(c => c.id === parseInt(selectedClassId))?.nom}</p>
                    <p><strong>Nombre d'élèves:</strong> {selectedReport.totalElevesClasse}</p>
                    <p>
                      <strong>Absences (non justifiées):</strong>{" "}
                      <span className="text-red-600">{selectedReport.absencesNonJustifieesHeures ?? 0} h</span>
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-2 text-right text-xs">
                  Date d'édition: {new Date().toLocaleDateString("fr-FR")}
                </div>
              </div>

              {/* Tableau des notes */}
              <div className="mb-6 overflow-x-auto text-xs print:text-xs">
                <Table className="w-full border border-gray-300 print:border print:border-gray-400 print:border-collapse">
                  <TableHeader className="bg-blue-100 print:bg-gray-100">
                    <TableRow>
                      <TableHead className="min-w-[150px]">
                        Matière<br />
                        <span className="text-sm">المادة</span>
                      </TableHead>
                      <TableHead className="text-center">
                        Coeff<br />
                        <span className="text-sm">المعامل</span>
                      </TableHead>
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center">
                            {header}<br />
                            <span className="text-sm">
                              {header.toLowerCase().includes('devoir') ? 'الاختبار' : ''}
                            </span>
                          </TableHead>
                        ))}
                      
                      {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                        <TableHead key="moy-dev-pond-header" className="text-center">
                          Moy. devoir *3<br />
                          <span className="text-sm">معدل الاختبارات *3</span>
                        </TableHead>
                      )}
                      
                      {dynamicEvaluationHeaders
                        .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                        .map(header => (
                          <TableHead key={header} className="text-center min-w-[120px]">
                            {header.toLowerCase().startsWith('compo')
                              ? `Compo. ${header.replace(/composition\s*/i, '')}`
                              : header}
                            <br />
                            {header.toLowerCase().startsWith('compo')
                                ? `امتحان ${header.replace(/composition\s*/i, '')}`
                                : ''}
                          </TableHead>
                        ))}
                      
                      <TableHead className="text-center">
                        Moy. Matiere<br />
                        <span className="text-sm">معدل المادة</span>
                      </TableHead>
                      <TableHead className="min-w-[150px]">
                        Observation<br />
                        <span className="text-sm">ملاحظة</span>
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
                        <TableCell className="observation-column" style={{ textAlign: 'left', paddingLeft: '16px' }}></TableCell>
                      </TableRow>
                    ))}

                    {/* Ligne des totaux */}
                    <TableRow className="bg-gray-50 font-bold print:bg-gray-100">
                      <TableCell>Totaux</TableCell>
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
                  <h3 className="font-bold mb-2">Appréciation du Conseil de Classe</h3>
                  <p className="italic">{selectedReport.teacherComment}</p>
                  <p className="text-right mt-4 text-xs">Signature du Professeur Principal</p>
                </div>
                <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
                  <h3 className="font-bold mb-2">Observations du Directeur</h3>
                  <p className="italic">{selectedReport.principalComment}</p>
                  <p className="text-right mt-4 text-xs">Signature du Directeur</p>
                </div>
              </div>

              {/* Résultats finaux */}
              <div className="mb-6 text-center grid grid-cols-2 md:grid-cols-4 gap-6 print:text-sm bg-gray-50 p-5 rounded-lg shadow-md">
                {[{
                  label: "Moyenne Générale",
                  value: `${selectedReport.avg}/20`,
                  textColor: "text-blue-700"
                }, {
                  label: "Rang",
                  value: selectedReport.rank,
                  textColor: "text-gray-900"
                }, {
                  label: "Mention",
                  value: getMention(parseFloat(selectedReport.avg)),
                  textColor: "text-indigo-600"
                }, {
                  label: "Décision",
                  value: parseFloat(selectedReport.avg) >= 10 ? "Admis(e)" : "Non Admis(e)",
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
                <p className="mt-2">Cachet et Signature de l'Administration</p>
                <p className="mt-2">
                  {schoolName} - {address}
                  {phone && ` - Tél: ${phone}`}
                  {website && ` - Site: ${website}`}
                </p>
              </div>
            </div>
          )}

          {/* Actions non imprimables */}
          <div className="bg-gray-100 px-6 py-4 flex justify-end gap-4 rounded-b-lg no-print">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Fermer
            </Button>
            <Button 
              onClick={exportPreviewedReport} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <FileDown className="mr-2 h-4 w-4" /> Exporter en PDF
            </Button>
            <Button 
              onClick={printPreviewedReport} 
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="mr-2 h-4 w-4" /> Imprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}