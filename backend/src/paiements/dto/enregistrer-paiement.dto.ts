import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

const MOIS_SCOLAIRES = [
  'Octobre', 'Novembre', 'Décembre', 'Janvier', 'Février',
  'Mars', 'Avril', 'Mai', 'Juin',
];

export class EnregistrerPaiementDto {
  @IsNumber()
  @IsNotEmpty()
  eleveId: number;

  @IsNumber()
  @IsNotEmpty()
  anneeScolaireId: number;

  @IsString()
  @IsIn(MOIS_SCOLAIRES)
  mois: string;

  @IsNumber()
  @IsPositive({ message: 'Le montant versé doit être un nombre positif.' })
  montantVerse: number;

  @IsNumber()
  @IsPositive({ message: 'Le montant officiel doit être un nombre positif.' })
  @IsOptional()
  montantOfficiel?: number;
}

