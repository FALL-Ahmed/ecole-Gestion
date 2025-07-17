import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';

class AbsenceCreationPayload {
  @IsNumber() @IsNotEmpty()
  professeur_id: number;

  @IsNumber() @IsNotEmpty()
  classe_id: number;

  @IsNumber() @IsNotEmpty()
  matiere_id: number;

  @IsDateString() @IsNotEmpty()
  date_absence: string;

  @IsString() @IsNotEmpty()
  heure_debut: string;

  @IsString() @IsNotEmpty()
  heure_fin: string;

  @IsNumber() @IsNotEmpty()
  annee_scolaire_id: number;
}

export class BulkManageAbsencesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AbsenceCreationPayload)
  creations: AbsenceCreationPayload[];

  @IsArray()
  @IsInt({ each: true })
  deletions: number[];
}
