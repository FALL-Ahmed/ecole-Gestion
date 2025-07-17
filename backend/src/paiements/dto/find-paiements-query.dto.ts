import { IsNotEmpty, IsNumberString } from 'class-validator';

export class FindPaiementsQueryDto {
  @IsNotEmpty({ message: 'Le `classeId` est requis.' })
  @IsNumberString({}, { message: 'Le `classeId` doit être un nombre.' })
  classeId: string;

  @IsNotEmpty({ message: 'Le `anneeScolaireId` est requis.' })
  @IsNumberString({}, { message: 'Le `anneeScolaireId` doit être un nombre.' })
  anneeScolaireId: string;
}

