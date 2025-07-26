import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, IsBoolean, IsArray, IsNumber } from 'class-validator';
import { UserRole, Genre } from '../user.entity';

export class CreateUserDto {
  @IsString()
  @MaxLength(100)
  nom: string;

  @IsString()
  @MaxLength(100)
  prenom: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  motDePasse?: string;

  @IsOptional()
  @IsEnum(UserRole, { message: 'Le rôle doit être admin, professeur ou eleve' })
  role?: UserRole;

  @IsOptional()
  @IsEnum(Genre, { message: 'Le genre doit être masculin ou feminin' })
  genre?: Genre;

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  tuteurNom?: string;

  @IsOptional()
  @IsString()
  tuteurTelephone?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsArray()
  @IsOptional()
  @IsNumber({}, { each: true })
  blocIds?: number[];

  @IsOptional()
  @IsEmail()
  parentEmail?: string;
}
