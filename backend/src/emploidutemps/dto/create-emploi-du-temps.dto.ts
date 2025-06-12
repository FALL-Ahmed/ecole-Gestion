import { IsNotEmpty, IsEnum, IsString, IsNumber } from 'class-validator';
import { JourSemaine } from '../emploidutemps.entity';

export class CreateEmploiDuTempsDto {
  @IsNotEmpty()
  @IsEnum(JourSemaine)
  jour: JourSemaine;

  @IsNotEmpty()
  @IsString() // Format: HH:mm:ss
  heure_debut: string;

  @IsNotEmpty()
  @IsString() // Format: HH:mm:ss
  heure_fin: string;

  @IsNotEmpty()
  @IsNumber()
  classe_id: number;

  @IsNotEmpty()
  @IsNumber()
  matiere_id: number;

  @IsNotEmpty()
  @IsNumber()
  professeur_id: number;
}