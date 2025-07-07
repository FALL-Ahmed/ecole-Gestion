import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto'; // Assurez-vous que ce DTO existe
import { IsString, MinLength, IsOptional } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  ancienMotDePasse?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' })
  nouveauMotDePasse?: string;
}
