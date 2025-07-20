import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString({ message: 'Le mot de passe actuel doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le mot de passe actuel ne peut pas être vide.' })
  currentPassword: string;

  @IsString({ message: 'Le nouveau mot de passe doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le nouveau mot de passe ne peut pas être vide.' })
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
  })
  newPassword: string;
}
