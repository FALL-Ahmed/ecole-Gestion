import { IsString, IsDateString, IsInt } from 'class-validator';

export class CreateTrimestreDto {
  @IsString()
  nom: string;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;

  @IsInt()
  annee_scolaire_id: number;
}
