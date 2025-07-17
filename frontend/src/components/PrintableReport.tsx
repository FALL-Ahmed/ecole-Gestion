import React from 'react';

interface BulletinEleve {
  name: string;
  avg: string;
  rank: string;
  teacherComment: string;
  principalComment: string;
  notesParMatiere: any[];
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
}

export const PrintableReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(
  ({ report, establishmentInfo, selectedClass, selectedTerm, selectedYear, dynamicEvaluationHeaders, getMention }, ref) => {
    if (!report) return null;

    return (
      <div ref={ref} style={{padding:20, background:'#fff'}}>
        <h2>Bulletin de notes pour {report.name}</h2>
        <p>Classe : {selectedClass} | Année : {selectedYear} | Trimestre : {selectedTerm}</p>
        <p>Moyenne générale : <strong>{report.avg}</strong></p>
        <p>Rang : {report.rank}</p>
        <p>Absences non justifiées : {report.absencesNonJustifieesHeures ?? 0} heures</p>
        <table style={{width:'100%', margin:'20px 0'}}>
          <thead>
            <tr>
              <th>Matière</th>
              <th>Coef</th>
              {dynamicEvaluationHeaders.map((header, i) => (<th key={i}>{header}</th>))}
              <th>Moyenne</th>
            </tr>
          </thead>
          <tbody>
            {report.notesParMatiere.map((matiere, idx) => (
              <tr key={idx}>
                <td>{matiere.matiere}</td>
                <td>{matiere.coefficient}</td>
                {dynamicEvaluationHeaders.map((header, i) => {
                  const noteObj = matiere.notesEvaluations.find((n:any) => n.libelle === header);
                  return <td key={i}>{noteObj ? noteObj.note : '00'}</td>;
                })}
                <td>{matiere.moyenneMatiere}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <strong>Appréciation :</strong> {report.teacherComment}
        </div>
        <div>
          <strong>Mention :</strong> {getMention(parseFloat(report.avg))}
        </div>
      </div>
    );
  }
);

PrintableReport.displayName = 'PrintableReport';