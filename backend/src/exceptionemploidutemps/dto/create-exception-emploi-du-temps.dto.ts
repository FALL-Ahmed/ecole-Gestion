// src/exception-emploi-du-temps/dto/create-exception-emploi-du-temps.dto.ts
import { IsNotEmpty, IsEnum, IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { JourSemaine, TypeException } from '../exceptionemploidutemps.entity';

export class CreateExceptionEmploiDuTempsDto {
  @IsNotEmpty()
  @IsDateString()
  date_exception: string; // Format YYYY-MM-DD

  @IsNotEmpty()
  @IsEnum(JourSemaine)
  jour: JourSemaine;

  @IsNotEmpty()
  @IsString() // Format: HH:mm:ss
  heure_debut: string;

  @IsNotEmpty()
  @IsString() // Format: HH:mm:ss
  heure_fin: string;

  @IsOptional()
  @IsNumber()
  classe_id: number | null;

  @IsOptional()
  @IsNumber()
  professeur_id: number | null;

  @IsNotEmpty()
  @IsEnum(TypeException)
  type_exception: TypeException;

  @IsOptional()
  @IsNumber()
  nouvelle_matiere_id: number | null;

  @IsOptional()
  @IsNumber()
  nouveau_professeur_id: number | null;

  @IsOptional()
  @IsString() // Format: HH:mm:ss
  nouvelle_heure_debut: string | null;

  @IsOptional()
  @IsString() // Format: HH:mm:ss
  nouvelle_heure_fin: string | null;

  @IsOptional()
  @IsNumber()
  nouvelle_classe_id: number | null;

  @IsOptional()
  @IsEnum(JourSemaine)
  nouveau_jour: JourSemaine | null;

  @IsOptional()
  @IsString()
  motif: string | null;
}
