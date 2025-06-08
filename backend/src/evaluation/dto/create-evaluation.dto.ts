export class CreateEvaluationDto {
  matiereId: number;
  classeId: number;
  professeurId: number;
  type: string;
  dateEval: string; // format 'YYYY-MM-DD' ou Date
  trimestre: string; // ou enum si tu as un enum pour ça
  anneeScolaireId: number;
}
