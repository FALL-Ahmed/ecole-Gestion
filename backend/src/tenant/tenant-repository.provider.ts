import { Provider, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { TenantConnectionManager } from './tenant-connection.manager';

/**
 * Creates a request-scoped provider for a TypeORM repository.
 * This provider uses the TenantConnectionManager to get the correct
 * DataSource for the current tenant and then creates the repository from it.
 *
 * @param entity The entity for which to create the repository provider.
 * @returns A NestJS provider configuration.
 */
export function createTenantRepositoryProvider(entity: EntityClassOrSchema): Provider {
  return {
    provide: getRepositoryToken(entity),
    scope: Scope.REQUEST,
    inject: [TenantConnectionManager, REQUEST],
    useFactory: async (connectionManager: TenantConnectionManager, request: any) => {
      const tenantId = request.tenantId;
      if (!tenantId) {
        throw new Error('Tenant ID not found on request object. Ensure TenantMiddleware is configured correctly.');
      }
      const dataSource = await connectionManager.getDataSource(tenantId);
      return dataSource.getRepository(entity);
    },
  };
}

