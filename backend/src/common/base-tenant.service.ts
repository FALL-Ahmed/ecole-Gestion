import { Inject, Injectable, Logger, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export abstract class BaseTenantService {
  protected readonly logger: Logger;

  constructor(@Inject(REQUEST) protected readonly request: Request) {
    // Initialize logger with the name of the concrete class that extends this base class
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Retrieves the blocId from the current request context.
   * It prioritizes the blocId from the JWT token, then falls back to a query parameter.
   * This ensures that admins/teachers/students operate within their assigned bloc,
   * while parents can specify which child's bloc they are viewing.
   * @returns The blocId number, or null if not found.
   */
  protected getBlocId(): number | null {
    const user = this.request.user as any;

    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} found in JWT token.`);
      return user.blocId;
    }

    this.logger.warn(`[getBlocId] No blocId found for user ${user?.email}.`);
    return null;
  }
}

