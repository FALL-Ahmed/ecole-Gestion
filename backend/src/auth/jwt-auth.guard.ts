import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    this.logger.log('JwtAuthGuard activated');
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Cette méthode est appelée après la tentative d'authentification de Passport.
    // 'info' contient la raison de l'échec (ex: TokenExpiredError, JsonWebTokenError).
    if (err || !user) {
      this.logger.error(
        `[handleRequest] Échec de l'authentification. Info: ${
          info?.message || 'Aucune info'
        }. Erreur: ${err || 'Aucune erreur'}`,
      );
      throw err || new UnauthorizedException(info?.message || 'Accès non autorisé');
    }
    return user;
  }
}