import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "L'email doit être une adresse email valide." })
  @IsNotEmpty({ message: "L'email ne peut pas être vide." })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe ne peut pas être vide.' })
  password: string;
}

