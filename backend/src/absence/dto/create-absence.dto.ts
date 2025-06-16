import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class CreateAbsenceDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'heure_debut must be in HH:MM:SS format',
  })
  heure_debut?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/, {
    message: 'heure_fin must be in HH:MM:SS format',
  })
  heure_fin?: string;

  @IsNotEmpty()
  @IsBoolean()
  justifie: boolean;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsNotEmpty()
  @IsInt()
  etudiant_id: number;

  @IsOptional()
  @IsInt()
  matiere_id?: number;

  @IsNotEmpty()
  @IsInt()
  classe_id: number;

  @IsNotEmpty()
  @IsInt()
  annee_scolaire_id: number;
}
