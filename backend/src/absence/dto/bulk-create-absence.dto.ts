import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';

export class AbsenceDetailDto {
  @IsNotEmpty()
  @IsInt()
  etudiant_id: number;

  @IsNotEmpty()
  @IsBoolean()
  present: boolean;

  @IsOptional()
  @IsBoolean()
  justifie?: boolean;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsInt()
  existingAbsenceId?: number | null;
}

export class BulkCreateAbsenceDto {
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @IsNotEmpty()
  @IsInt()
  classe_id: number;

  @IsNotEmpty()
  @IsInt()
  matiere_id: number;

  @IsNotEmpty()
  @IsInt()
  annee_scolaire_id: number;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  heure_debut: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/)
  heure_fin: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbsenceDetailDto)
  details: AbsenceDetailDto[];
}
