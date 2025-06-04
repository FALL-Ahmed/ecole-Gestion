import { UserRole } from '../user.entity';

export class CreateUserDto {
  nom: string;
  prenom: string;
  email: string;
  motDePasse?: string;
  role?: UserRole;
  genre?: string;
  adresse?: string;
  photoUrl?: string;
  tuteurNom?: string;
  tuteurTelephone?: string;
  actif?: boolean;
  dateInscription?: Date;
}
