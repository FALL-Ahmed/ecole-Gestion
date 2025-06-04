import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(email: string, password: string): Promise<any> {
    console.log(`🔍 Recherche utilisateur avec email: ${email}`);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      console.log(`❌ Aucun utilisateur trouvé avec cet email.`);
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    if (!user.actif) {
      throw new UnauthorizedException('Votre compte est désactivé.');
    }

    console.log(`🔍 Utilisateur trouvé:`, user);
    console.log(`🔐 Comparaison des mots de passe...`);

    // Ici, idéalement, tu compares le hash, mais si tu compares en clair :
    if (password.trim() !== user.motDePasse) {
      console.log('❌ Mot de passe incorrect.');
      throw new UnauthorizedException('Email ou mot de passe incorrect.');
    }

    console.log(`✅ Mot de passe correct.`);

    // Supprimer motDePasse avant retour
    const { motDePasse, ...result } = user;
    return result;
  }
}
