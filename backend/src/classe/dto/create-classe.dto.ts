import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Niveau } from '../classe.entity';

export class CreateClasseDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsEnum(Niveau)
  niveau: Niveau;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  anneeScolaireId: number;
}