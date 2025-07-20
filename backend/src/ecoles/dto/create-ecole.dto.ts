import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateEcoleDto {
  @IsString()
  @IsNotEmpty({ message: "Le nom de l'établissement ne peut pas être vide." })
  nom_etablissement: string;

  @IsString()
  @IsNotEmpty({ message: 'Le sous-domaine ne peut pas être vide.' })
  @Length(3, 100)
  sous_domaine: string;

  @IsString()
  @IsNotEmpty({ message: 'Le nom de la base de données ne peut pas être vide.' })
  @Length(3, 100)
  db_name: string;
}

