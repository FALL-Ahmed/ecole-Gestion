import { IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateNoteDto {
  @IsNotEmpty()
  @IsNumber()
  evaluation_id: number;

  @IsNotEmpty()
  @IsNumber()
  etudiant_id: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Max(20) // Adaptez le maximum si nécessaire
  note: number;

 
}