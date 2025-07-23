// src/auth/jwt.strategy.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AdminService } from '../admin/admin.service';
import { ParentService } from '../central/parent.service';
import { ModuleRef, ContextIdFactory } from '@nestjs/core';

export interface RequestWithUser extends Request {
  tenantId?: string;
}

export interface JwtPayload {
  sub: number | string;
  email: string;
  role: string;
  blocId?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private readonly moduleRef: ModuleRef,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error("Le secret JWT n'est pas défini dans les variables d'environnement (JWT_SECRET).");
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
    this.logger.log('JwtStrategy instanciée (Singleton).');
  }

  private async findUserByPayload(payload: JwtPayload, contextId: any): Promise<any> {
    this.logger.debug(`[findUserByPayload] Payload reçu : ${JSON.stringify(payload)}`);

    const { role, sub, email } = payload;
    this.logger.debug(`[findUserByPayload] Recherche utilisateur avec rôle : ${role}`);

    try {
      // Résoudre les services dans le contexte de la requête actuelle
      const usersService = await this.moduleRef.resolve(UsersService, contextId, { strict: false });
      const adminService = await this.moduleRef.resolve(AdminService, contextId, { strict: false });
      const parentService = await this.moduleRef.resolve(ParentService, contextId, { strict: false });

      switch (role) {
        case 'superadmin':
          this.logger.debug(`[findUserByPayload] 🔎 Recherche superadmin ID=${sub}`);
          return await adminService.findById(Number(sub));
        case 'parent':
          this.logger.debug(`[findUserByPayload] 🔎 Recherche parent ID=${sub}`);
          return await parentService.findOne(String(sub));
        default:
          this.logger.debug(`[findUserByPayload] 🔎 Recherche user par email=${email}`);
          return await usersService.findByEmailWithPassword(email);
      }
    } catch (err) {
      this.logger.error(`[findUserByPayload] ❌ Erreur lors de la recherche utilisateur : ${err.message}`, err.stack);
      throw err;
    }
  }

  async validate(req: RequestWithUser, payload: JwtPayload) {
    // Créer un ID de contexte pour la requête actuelle afin de résoudre les providers à portée de requête
    const contextId = ContextIdFactory.getByRequest(req);

    this.logger.log(`🚀 [validate] Démarrage validation JWT pour email=${payload.email}, role=${payload.role}, blocId=${payload.blocId}`);

    // Étape 1: attacher tenantId si présent
    if (payload.blocId) {
      req.tenantId = `bloc_${payload.blocId}`;
      this.logger.debug(`[validate] ✅ TenantId attaché à la requête : bloc_${payload.blocId}`);
    } else {
      this.logger.debug('[validate] ℹ️ Aucun blocId dans le payload.');
    }

    // Étape 2: rechercher l'utilisateur en passant l'ID de contexte
    const user = await this.findUserByPayload(payload, contextId);

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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { motDePasse, mot_de_passe, ...userSansMotDePasse } = user;

    this.logger.log(`[validate] ✅ Validation réussie, utilisateur attaché à la requête : ${user.email || user.id}`);
    // L'objet retourné sera attaché à `req.user` par Passport.
    return {
      ...userSansMotDePasse,
      blocId: payload.blocId,
    };
  }
}
