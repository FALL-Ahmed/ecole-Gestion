import { IsNumber, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

export class CreateNoteDto {
  @IsNumber({}, { message: "La note doit être un nombre." })
  @IsNotEmpty({ message: "La note ne peut pas être vide." })
  @Min(0, { message: "La note minimale est 0." })
  @Max(20, { message: "La note maximale est 20." }) // Assurez-vous que cette limite est appropriée pour votre système de notation
  note: number;

  @IsInt({ message: "L'ID de l'évaluation doit être un entier." })
  @IsNotEmpty({ message: "L'ID de l'évaluation ne peut pas être vide." })
  evaluation_id: number; // Correspond à la clé étrangère

  @IsInt({ message: "L'ID de l'étudiant doit être un entier." })
  @IsNotEmpty({ message: "L'ID de l'étudiant ne peut pas être vide." })
  etudiant_id: number; // Correspond à la clé étrangère
}