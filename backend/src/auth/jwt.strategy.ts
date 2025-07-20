// src/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { AdminService } from 'src/admin/admin.service';
import { ParentService } from 'src/central/parent.service';

export interface JwtPayload {
  sub: number | string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { // <-- Ajoutez 'jwt' ici
  // ... reste du code inchangé
  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly parentService: ParentService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev_secret_key',
    });
  }

  async validate(payload: JwtPayload) {
    let user: any;

    // Distinguer l'utilisateur en fonction de son rôle dans le payload
    if (payload.role === 'superadmin') {
      user = await this.adminService.findById(Number(payload.sub));
    } else if (payload.role === 'parent') {
      // L'ID du parent est un UUID (string), donc il faut ajuster le payload ou la recherche
      user = await this.parentService.findOne(String(payload.sub));
    } else {
      user = await this.usersService.findById(Number(payload.sub));
    }

    // Vérification commune
    if (!user) {
      throw new UnauthorizedException("Utilisateur introuvable.");
    }
    if (user.actif === false) { // Gère le cas où `actif` est undefined pour l'admin
      throw new UnauthorizedException("Compte inactif.");
    }

    // Ce qui est retourné ici sera injecté dans `request.user` dans les routes protégées
    const { motDePasse, mot_de_passe, ...userSansMotDePasse } = user;
    return userSansMotDePasse;
  }
}
