// Exemple (ajustez selon vos besoins si vous utilisez d'autres validateurs)
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class CreateInscriptionDto {
  @IsNumber()
  utilisateur_id: number;

  @IsNumber()
  classe_id: number;

  @IsNumber()
  annee_scolaire_id: number;

  @IsOptional()
  @IsBoolean() // Assurez-vous que c'est bien IsBoolean
  actif?: boolean;
}