import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const host = req.headers.host;

    // 🔐 Vérifie que l'en-tête "host" est bien présent
    if (!host) {
      console.error('[TenantMiddleware] En-tête "host" manquant');
      return res.status(400).json({ message: 'En-tête "host" manquant' });
    }

    // 🏠 Mode local (localhost) → base par défaut
    if (host.includes('localhost')) {
      (req as any).tenantId = 'default';
      console.log('[TenantMiddleware] Mode local - Tenant par défaut utilisé');
      return next();
    }

    // 👑 Mode Admin : on ne traite pas comme un tenant
    if (host.startsWith('admin.')) {
      (req as any).tenantId = 'admin_portal'; // On met une valeur pour éviter les erreurs, mais elle ne sera pas utilisée pour une connexion DB
      console.log('[TenantMiddleware] Mode Admin détecté');
      return next();
    }

    // 🌐 Production : extraction du sous-domaine (ex: "lycee" dans "lycee.mon-app.com")
    const domainParts = host.split('.');
    const tenantId = domainParts.length >= 3 ? domainParts[0] : null;

    if (!tenantId) {
      console.error('[TenantMiddleware] Aucun sous-domaine valide détecté');
      return res.status(400).json({ message: 'Sous-domaine non valide' });
    }

    (req as any).tenantId = tenantId;
    console.log(`[TenantMiddleware] Tenant identifié : ${tenantId}`);
    next();
  }
}
