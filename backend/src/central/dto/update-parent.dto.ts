import { IsOptional, IsString, Length, IsEmail, Matches } from 'class-validator';

export class UpdateParentDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  nom?: string;

  @IsOptional()
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9]{8}$/)
  telephone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Length(8, 100)
  mot_de_passe?: string;

  @IsOptional()
  @IsString()
  adresse?: string;
}
