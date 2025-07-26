import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateBlocDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nom: string;

  @IsString()
  @IsOptional()
  adresse?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  telephone?: string;
}

