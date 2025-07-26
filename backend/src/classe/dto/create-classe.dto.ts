import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { Niveau } from '../classe.entity';

export class CreateClasseDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEnum(Niveau)
  @IsNotEmpty()
  niveau: Niveau;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsNotEmpty()
  anneeScolaireId: number;

  @IsNumber()
  frais_scolarite: number;
}