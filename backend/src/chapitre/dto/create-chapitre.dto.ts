import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString, IsEnum, MinLength } from 'class-validator';
import { StatutChapitre } from '../chapitre.entity'; // Assurez-vous que le chemin est correct

export class CreateChapitreDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  titre: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @IsNotEmpty()
  matiereId: number;

  @IsInt()
  @IsNotEmpty()
  classeId: number;

  @IsDateString()
  @IsOptional()
  dateDebutPrevue?: string;

  @IsDateString()
  @IsOptional()
  dateFinPrevue?: string;

  @IsDateString()
  @IsOptional()
  dateDebutReel?: string;

  @IsDateString()
  @IsOptional()
  dateFinReel?: string;


  @IsEnum(StatutChapitre)
  @IsOptional()
  statut?: StatutChapitre;
}
