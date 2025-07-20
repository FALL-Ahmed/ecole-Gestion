import { IsNotEmpty, IsString, Length, IsEmail, Matches } from 'class-validator';

export class CreerParentDto {
  @IsNotEmpty()
  @IsString()
  @Length(2, 100)
  nom: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 8)
  @Matches(/^[0-9]{8}$/, { message: 'Le numéro doit contenir exactement 8 chiffres' })
  telephone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(8, 100)
  mot_de_passe: string;

  @IsString()
  adresse?: string;
}