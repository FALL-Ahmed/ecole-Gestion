import { IsNotEmpty, IsNumber } from 'class-validator';

export class SelectBlocDto {
  @IsNumber({}, { message: "L'ID du bloc doit être un nombre." })
  @IsNotEmpty({ message: "L'ID du bloc ne peut pas être vide." })
  blocId: number;
}

