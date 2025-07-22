// src/auth/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException, Scope } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AdminService } from 'src/admin/admin.service';
import { ParentService } from 'src/central/parent.service';

export interface JwtPayload {
  sub: number | string;
  email: string;
  role: string;
  blocId?: number;
}

@Injectable({ scope: Scope.REQUEST })
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly adminService: AdminService,
    private readonly parentService: ParentService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error("Le secret JWT n'est pas défini dans les variables d'environnement (JWT_SECRET).");
    }

    // 👇 Log lors de l'initialisation de la stratégie
    console.log('✅ [JwtStrategy] Initialisation avec le secret trouvé.');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  private async findUserByPayload(payload: JwtPayload): Promise<any> {
    this.logger.debug(`[findUserByPayload] Payload reçu : ${JSON.stringify(payload)}`);

    const { role, sub, email } = payload;
    this.logger.debug(`[findUserByPayload] Recherche utilisateur avec rôle : ${role}`);

    try {
      switch (role) {
        case 'superadmin':
          this.logger.debug(`[findUserByPayload] 🔎 Recherche superadmin ID=${sub}`);
          return await this.adminService.findById(Number(sub));
        case 'parent':
          this.logger.debug(`[findUserByPayload] 🔎 Recherche parent ID=${sub}`);
          return await this.parentService.findOne(String(sub));
        default:
          this.logger.debug(`[findUserByPayload] 🔎 Recherche user par email=${email}`);
          return await this.usersService.findByEmailWithPassword(email);
      }
    } catch (err) {
      this.logger.error(`[findUserByPayload] ❌ Erreur lors de la recherche utilisateur : ${err.message}`, err.stack);
      throw err;
    }
  }

  async validate(req: Request, payload: JwtPayload) {
    this.logger.log(`🚀 [validate] Démarrage validation JWT pour email=${payload.email}, role=${payload.role}, blocId=${payload.blocId}`);

    // Étape 1: attacher tenantId si présent
    if (payload.blocId) {
      (req as any).tenantId = `bloc_${payload.blocId}`;
      this.logger.debug(`[validate] ✅ TenantId attaché à la requête : bloc_${payload.blocId}`);
    } else {
      this.logger.debug('[validate] ℹ️ Aucun blocId dans le payload.');
    }

    // Étape 2: rechercher l'utilisateur
    const user = await this.findUserByPayload(payload);

    if (!user) {
      this.logger.warn(`[validate] ⚠️ Utilisateur introuvable pour payload=${JSON.stringify(payload)}`);
      throw new UnauthorizedException('Utilisateur introuvable.');
    }

    this.logger.debug(`[validate] ✅ Utilisateur trouvé : ${user.email || user.id}`);

    // Vérifier l'état actif si la propriété existe
    if (user.hasOwnProperty('actif') && user.actif === false) {
      this.logger.warn(`[validate] ⚠️ Compte inactif pour : ${user.email}`);
      throw new UnauthorizedException('Compte inactif.');
    }

    const { motDePasse, mot_de_passe, ...userSansMotDePasse } = user;

    this.logger.log(`[validate] ✅ Validation réussie, utilisateur attaché à la requête : ${user.email}`);
    return {
      ...userSansMotDePasse,
      blocId: payload.blocId,
    };
  }
}
