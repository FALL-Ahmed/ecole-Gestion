import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.actif) {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif.');
    }

    const storedPassword = user.motDePasse;

    // Vérifier si mot de passe est déjà haché (bcrypt hash commence par $2a$, $2b$ ou $2y$)
    const isHashed =
      storedPassword.startsWith('$2a$') ||
      storedPassword.startsWith('$2b$') ||
      storedPassword.startsWith('$2y$');

    let passwordValid = false;

    if (isHashed) {
      // Comparaison hash
      passwordValid = await bcrypt.compare(password, storedPassword);
    } else {
      // Ancien mot de passe en clair (migration)
      passwordValid = password === storedPassword;

      if (passwordValid) {
        // Migration : hacher et mettre à jour en base
        const hashedPassword = await bcrypt.hash(password, 10);
        user.motDePasse = hashedPassword;
await this.usersService.updatePasswordWithoutOld(user.id, hashedPassword);
      }
    }

    if (!passwordValid) {
      throw new UnauthorizedException('Mot de passe incorrect.');
    }

    // Supprimer motDePasse avant retour
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { motDePasse, ...result } = user;
    return result;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);

    const payload = { sub: user.id, email: user.email, role: user.role };

    return {
      access_token: this.jwtService.sign(payload),
      user,
    };
  }
}
