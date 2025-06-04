import { IsString, IsDateString, Length } from 'class-validator';

export class CreateAnneeAcademiqueDto {
  @IsString()
  @Length(4, 20)
  libelle: string;

  @IsDateString()
  date_debut: string;

  @IsDateString()
  date_fin: string;
}
