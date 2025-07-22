import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Interface pour étendre l'objet Request de Express et y ajouter `tenantId`.
 * Cela offre une meilleure autocomplétion et sécurité de type.
 */
export interface RequestWithTenant extends Request {
  tenantId: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  /**
   * Ce middleware s'exécute pour chaque requête. Son rôle est de définir un
   * `tenantId` initial sur l'objet `request` en se basant sur le sous-domaine.
   *
   * IMPORTANT: Ce middleware s'exécute AVANT les Guards (comme JwtAuthGuard).
   * Si un utilisateur est connecté, la `JwtStrategy` (exécutée par le guard)
   * aura l'opportunité d'ÉCRASER le `tenantId` avec la valeur du `blocId`
   * provenant du jeton JWT (ex: 'bloc_123'). C'est le comportement souhaité.
   */
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    // Si un middleware précédent a déjà défini le tenantId, on ne fait rien.
    if (req.tenantId) {
      return next();
    }

    const host = req.headers.host;

    if (!host) {
      console.error('[TenantMiddleware] En-tête "host" manquant dans la requête.');
      throw new BadRequestException('Requête invalide.');
    }

    // Cas 1: Développement en local
    if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
      req.tenantId = 'default'; // Assurez-vous d'avoir une DB 'ecole_default' pour les tests
      console.log(`[TenantMiddleware] Mode local. Tenant initialisé à: "${req.tenantId}"`);
      return next();
    }

    // Cas 2: Portail d'administration central (superadmin)
    if (host.startsWith('admin.')) {
      req.tenantId = 'admin_portal'; // Identifiant spécial pour la connexion centrale
      console.log(`[TenantMiddleware] Portail admin détecté. Tenant initialisé à: "${req.tenantId}"`);
      return next();
    }

    // Cas 3: Tenant standard via sous-domaine (ex: lycee1.madrastak.net)
    const domainParts = host.split('.');
    if (domainParts.length < 3) {
      console.error(`[TenantMiddleware] Hôte "${host}" ne contient pas de sous-domaine valide.`);
      throw new BadRequestException('Sous-domaine non valide.');
    }
    const tenantId = domainParts[0];

    req.tenantId = tenantId;
    console.log(`[TenantMiddleware] Tenant identifié par sous-domaine: "${tenantId}"`);

    next();
  }
}
