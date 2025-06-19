// Dans votre fichier update-chapitre.dto.ts côté backend
import { PartialType } from '@nestjs/mapped-types';
import { CreateChapitreDto } from './create-chapitre.dto';
import { IsOptional, IsDateString, IsEnum, IsString, IsNumber } from 'class-validator';
import { StatutChapitre } from '../chapitre.entity'; // Ajustez le chemin d'importation si nécessaire

export class UpdateChapitreDto extends PartialType(CreateChapitreDto) {
    @IsOptional()
  @IsString({ message: 'Le titre doit être une chaîne de caractères.' })
  titre?: string;

  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères.' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de la classe doit être un nombre.' })
  classeId?: number;

  @IsOptional()
  @IsNumber({}, { message: 'L\'ID de la matiere  doit être un nombre.' })
  matiereId?: number;

  @IsOptional()
  @IsEnum(StatutChapitre, { message: 'Le statut fourni est invalide.' })
  statut?: StatutChapitre; // Utilisez le type StatutChapitre ici
 
  @IsOptional()
  @IsDateString({}, { message: 'La date de début réelle doit être une date valide (YYYY-MM-DD).' })
  dateDebutReel?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin réelle doit être une date valide (YYYY-MM-DD).' })
  dateFinReel?: string;
  
   @IsOptional()
  @IsDateString({}, { message: 'La date de début prévue doit être une date valide (YYYY-MM-DD).' })
  dateDebutPrevue?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fin prévue doit être une date valide (YYYY-MM-DD).' })
  dateFinPrevue?: string;
}
