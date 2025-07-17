// create-disciplinary-record.dto.ts
import { IsInt, IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class CreateDisciplinaryRecordDto {
  @IsInt()
  @IsNotEmpty()
  studentId: number;

  @IsInt()
  @IsNotEmpty()
  classId: number;

  @IsInt()
  @IsNotEmpty()
  schoolYearId: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsDateString() // Valide que c'est une date au format ISO (yyyy-MM-dd)
  @IsNotEmpty()
  date: string; // Format: 'yyyy-MM-dd'
}