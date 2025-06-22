import { IsString, IsOptional, IsEmail, IsUrl, MaxLength, IsNotEmpty } from 'class-validator';

export class CreateOrUpdateEtablissementInfoDto {
  @IsNotEmpty({ message: 'Le nom de l\'établissement ne peut pas être vide.' })
  @IsString()
  @MaxLength(255)
  schoolName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  directorName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Veuillez fournir une adresse email valide.'})
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUrl({}, { message: 'Veuillez fournir une URL de site web valide (ex: https://example.com).' })
  @MaxLength(255)
  website?: string;

 
}
