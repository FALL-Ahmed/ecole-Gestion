// src/tenant/tenant.module.ts
import { DynamicModule, Global, Module } from '@nestjs/common';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TenantConnectionManager } from './tenant-connection.manager';

@Global()
@Module({})
export class TenantModule {
  static forRoot(): DynamicModule {
    return {
      module: TenantModule,
      imports: [TypeOrmModule.forFeature([], 'central')],
      providers: [
        {
          provide: 'central',
          useFactory: (dataSource: DataSource) => dataSource,
          inject: [getDataSourceToken('central')],
        },
        TenantConnectionManager,
      ],
      exports: [TenantConnectionManager],
    };
  }
}