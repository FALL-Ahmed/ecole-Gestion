import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // Si aucun rôle n'est requis, on autorise
    }
    const { user } = context.switchToHttp().getRequest();

    // Vérifie si le rôle de l'utilisateur (user.role) est présent dans le tableau des rôles requis.
    // Il est aussi plus sûr de vérifier que 'user' et 'user.role' existent.
    return requiredRoles.some((role) => user?.role === role);
  }
}
