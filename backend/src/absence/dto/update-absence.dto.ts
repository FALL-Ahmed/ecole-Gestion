import { PartialType } from '@nestjs/mapped-types';
import { CreateAbsenceDto } from './create-absence.dto';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateAbsenceDto extends PartialType(CreateAbsenceDto) {
  @IsOptional()
  @IsBoolean()
  justifie?: boolean;

  @IsOptional()
  @IsString()
  justification?: string;
}
