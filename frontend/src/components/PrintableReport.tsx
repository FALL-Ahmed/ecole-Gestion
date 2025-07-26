import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { FileDown, Printer } from 'lucide-react';

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
  establishmentInfo: { 
    schoolName: string, 
    address: string, 
    phone?: string, 
    website?: string 
  };
  selectedClass: string;
  selectedTerm: string;
  selectedYear: string;
  dynamicEvaluationHeaders: string[];
  getMention: (m: number) => string;
  t: {
    common: {
      close: string;
      print: string;
      student: string;
      class: string;
      hourse: string;
      phone: string;
      website: string;
    };
    reportManagement: {
      republic: string;
      educationMinistry: string;
      examsDirection: string;
      republicAr: string;
      rank: string; // Add this

      educationMinistryAr: string;
      examsDirectionAr: string;
      reportTitle: string;
      schoolYear: string;
      term: string;
      establishment: string;
      studentId: string;
      studentsCount: string;
      unjustifiedAbsences: string;
      subject: string;
      subjectAr: string;
      coefficient: string;
      coefficientAr: string;
      testAr: string;
      weightedTestAvg: string;
      weightedTestAvgAr: string;
      exam: string;
      examAr: string;
      subjectAvg: string;
      subjectAvgAr: string;
      observation: string;
      observationAr: string;
      totals: string;
      classCouncilAppreciation: string;
      teacherSignature: string;
      directorObservations: string;
      directorSignature: string;
      overallAverage: string;
      mention: string;
      decision: string;
      passed: string;
      failed: string;
      adminStamp: string;
      printDate: string;
    };
    reports: {
      exportPDF: string;
    };
  };
  isRTL?: boolean;
  onClose?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
}

export const PrintableReport = React.forwardRef<HTMLDivElement, PrintableReportProps>(
  ({ 
    report, 
    establishmentInfo, 
    selectedClass, 
    selectedTerm, 
    selectedYear, 
    dynamicEvaluationHeaders, 
    getMention, 
    t, 
    isRTL = false,
    onClose,
    onPrint,
    onExport
  }, ref) => {
    if (!report) return null;

    return (
      <div 
        ref={ref}
  className="max-w-6xl w-full p-0 rounded-lg overflow-hidden print:overflow-visible h-[calc(100vh-2rem)] print:h-auto print:max-w-none print:rounded-none print:shadow-none print:border-none dark:bg-gray-900"
      >
        {/* Contenu imprimable */}
        <div 
          id="bulletin-preview-content-area" 
          className="bg-white dark:bg-gray-800 h-full overflow-y-auto px-8 pt-8 pb-8 print:p-0 print:overflow-visible print:h-auto print:border-none print:shadow-none"
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
                <span className="text-blue-700">{selectedYear}</span>
              </p>
              <p className="font-semibold text-sm">
                {t.reportManagement.term}:{" "}
                <span className="text-blue-700">{selectedTerm}</span>
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
                <p><strong>{t.reportManagement.establishment}:</strong> {establishmentInfo.schoolName}</p>
                <p><strong>{t.common.student}:</strong> {report.name}</p>
                <p><strong>{t.reportManagement.studentId}:</strong> 123456</p>
              </div>
              <div className="text-right md:pl-8">
                <p><strong>{t.common.class}:</strong> {selectedClass}</p>
                <p><strong>{t.reportManagement.studentsCount}:</strong> {report.totalElevesClasse}</p>
                <p>
                  <strong>{t.reportManagement.unjustifiedAbsences}:</strong>{" "}
                  <span className="text-red-600">{report.absencesNonJustifieesHeures ?? 0} {t.common.hourse}</span>
                </p>
              </div>
            </div>
            <div className="border-t border-gray-300 pt-2 text-right text-xs">
              {t.reportManagement.printDate}: {new Date().toLocaleDateString(isRTL ? 'ar-MA' : 'fr-FR')}
            </div>
          </div>

          {/* Tableau des notes */}
          <div className="mb-6 overflow-x-auto print:overflow-visible text-xs print:text-xs">
            <Table className="w-full border border-gray-300 print:border print:border-gray-400 print:border-collapse">
              <TableHeader className="bg-blue-100 print:bg-gray-100">
                <TableRow>
                  <TableHead style={{ minWidth: '170px', textAlign: 'left' }}>
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
                    <TableHead key="moy-dev-pond-header" className="text-center" style={{ minWidth: '90px' }}>
                      {t.reportManagement.weightedTestAvg}<br />
                      <span className="text-sm">{t.reportManagement.weightedTestAvgAr}</span>
                    </TableHead>
                  )}
                  
                  {dynamicEvaluationHeaders
                    .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                    .map(header => (
                      <TableHead key={header} className="text-center" style={{ minWidth: '80px' }}>
                        {header.toLowerCase().startsWith('compo')
                          ? `${t.reportManagement.exam} ${header.replace(/composition\s*/i, '')}`
                          : header}
                        <br />
                        {header.toLowerCase().startsWith('compo')
                            ? `${t.reportManagement.examAr} ${header.replace(/composition\s*/i, '')}`
                            : ''}
                      </TableHead>
                    ))}
                  
                  <TableHead className="text-center" style={{ minWidth: '90px' }}>
                    {t.reportManagement.subjectAvg}<br />
                    <span className="text-sm">{t.reportManagement.subjectAvgAr}</span>
                  </TableHead>
                  <TableHead style={{ minWidth: '25px', textAlign: 'left' }}>
                      {t.reportManagement.observation}<br />
                    <span className="text-sm">{t.reportManagement.observationAr}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {report.notesParMatiere.map(matiere => (
                  <TableRow key={matiere.matiere} className="even:bg-gray-50 print:even:bg-white">
                    <TableCell className="font-medium" style={{ minWidth: '170px', textAlign: 'left' }}>
                      <div className="flex justify-between items-center">
                        <span>{matiere.matiere}</span>
                        {matiere.matiereArabe && matiere.matiereArabe !== matiere.matiere && <span className="text-sm" dir="rtl">{matiere.matiereArabe}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{matiere.coefficient}</TableCell>
                    {dynamicEvaluationHeaders
                      .filter(header => header.toLowerCase().includes('devoir'))
                      .map(header => {
                        const noteObj = matiere.notesEvaluations.find((n: any) => n.libelle === header);
                        return (
                          <TableCell key={`${matiere.matiere}-${header}-devoir`} className="text-center">
                            {noteObj ? noteObj.note : "00"}
                          </TableCell>
                        );
                      })}
                    
                    {dynamicEvaluationHeaders.some(header => header.toLowerCase().includes('devoir')) && (
                      <TableCell key={`${matiere.matiere}-moy-dev-pond`} className="text-center">
                        {matiere.moyenneDevoirsPonderee != null ? matiere.moyenneDevoirsPonderee.toFixed(2) : '-'}
                      </TableCell>
                    )}
                    
                    {dynamicEvaluationHeaders
                      .filter(header => header.toLowerCase().includes('compo') && !header.toLowerCase().includes('devoir'))
                      .map(header => {
                        const noteObj = matiere.notesEvaluations.find((n: any) => n.libelle === header);
                        return (
                          <TableCell key={`${matiere.matiere}-${header}-compo`} className="text-center">
                            {noteObj ? noteObj.note : "00"}
                          </TableCell>
                        );
                      })}

                    <TableCell className="text-center font-bold">{matiere.moyenneMatiere.toFixed(2)}</TableCell>
                    <TableCell className="observation-column" style={{ textAlign: 'left', paddingLeft: '16px' }}></TableCell>
                  </TableRow>
                ))}

                {/* Ligne des totaux */}
                <TableRow className="bg-gray-50 font-bold print:bg-gray-100">
                  <TableCell>{t.reportManagement.totals}</TableCell>
                  <TableCell className="text-center">
                    {report.notesParMatiere.reduce((sum, matiere) => sum + matiere.coefficient, 0).toFixed(0)}
                  </TableCell>
                  <TableCell colSpan={dynamicEvaluationHeaders.length + 1}></TableCell>
                  <TableCell className="text-center">
                    {report.notesParMatiere
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
              <p className="italic">{report.teacherComment}</p>
              <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                {t.reportManagement.teacherSignature}
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50 print:bg-white print:border print:border-gray-300 print:rounded-md">
              <h3 className="font-bold mb-2">{t.reportManagement.directorObservations}</h3>
              <p className="italic">{report.principalComment}</p>
              <p className={`text-right mt-4 text-xs ${isRTL ? 'text-left' : 'text-right'}`}>
                {t.reportManagement.directorSignature}
              </p>
            </div>
          </div>

          {/* Résultats finaux */}
          <div className="mb-6 text-center grid grid-cols-2 md:grid-cols-4 gap-6 print:text-sm bg-gray-50 p-5 rounded-lg shadow-md">
            {[{
              label: t.reportManagement.overallAverage,
              value: `${report.avg}/20`,
              textColor: "text-blue-700"
            }, {
              label: t.reportManagement.rank,
              value: report.rank,
              textColor: "text-gray-900"
            }, {
              label: t.reportManagement.mention,
              value: getMention(parseFloat(report.avg)),
              textColor: "text-indigo-600"
            }, {
              label: t.reportManagement.decision,
              value: parseFloat(report.avg) >= 10 ? t.reportManagement.passed : t.reportManagement.failed,
              textColor: parseFloat(report.avg) >= 10 ? "text-green-600" : "text-red-600"
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
              {establishmentInfo.schoolName} - {establishmentInfo.address}
              {establishmentInfo.phone && ` - ${t.common.phone}: ${establishmentInfo.phone}`}
              {establishmentInfo.website && ` - ${t.common.website}: ${establishmentInfo.website}`}
            </p>
          </div>
        </div>

        {/* Actions non imprimables */}
        <div className="bg-gray-100 dark:bg-gray-800 px-6 py-4 flex justify-end gap-4 rounded-b-lg no-print">
          <Button 
            variant="outline" 
            onClick={onClose} 
            className="dark:border-gray-600 dark:text-white"
          >
            {t.common.close}
          </Button>
          <Button 
            onClick={onExport} 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <FileDown className="mr-2 h-4 w-4" /> {t.reports.exportPDF}
          </Button>
          <Button 
            onClick={onPrint} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Printer className="mr-2 h-4 w-4" /> {t.common.print}
          </Button>
        </div>
      </div>
    );
  }
);

PrintableReport.displayName = 'PrintableReport';