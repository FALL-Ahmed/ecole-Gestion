// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    // Facultatif mais recommandé : vérifier que l'utilisateur existe et est actif
    const user = await this.usersService.findById(payload.sub);

    if (!user || !user.actif) {
      throw new UnauthorizedException("Utilisateur introuvable ou inactif.");
    }

    // Ce qui est retourné ici sera injecté dans `request.user` dans les routes protégées
    const { motDePasse, ...userSansMotDePasse } = user;
    return userSansMotDePasse;
  }
}
