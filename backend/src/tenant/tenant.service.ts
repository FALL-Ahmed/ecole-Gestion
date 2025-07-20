// src/tenant/tenant.service.ts
import { Injectable, Scope, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { DataSource } from 'typeorm';

@Injectable({ scope: Scope.REQUEST })
export class TenantService {
  private tenantDbName: string | null = null;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    @Inject('central') private readonly centralDataSource: DataSource,
  ) {}

  async getTenantDbName(): Promise<string> {
    // Return cached value if already resolved
    if (this.tenantDbName) {
      return this.tenantDbName;
    }

    const tenantId = (this.request as any).tenantId;

    if (!tenantId) {
      throw new HttpException('Tenant ID not found in request', HttpStatus.BAD_REQUEST);
    }

    // Local development mode - return test database
    if (tenantId === 'default') {
      this.tenantDbName = 'school_management';
      return this.tenantDbName;
    }

    // Production mode - query central database
    try {
      const queryResult = await this.centralDataSource.query(
        `SELECT db_name FROM ecoles WHERE sous_domaine = $1 LIMIT 1`,
        [tenantId],
      );

      if (!queryResult || queryResult.length === 0) {
        throw new HttpException(
          `School with subdomain "${tenantId}" not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      this.tenantDbName = queryResult[0].db_name;
      
      if (!this.tenantDbName) {
        throw new HttpException(
          'Database name not configured for this school',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      return this.tenantDbName;
    } catch (error) {
      console.error('[TenantService] Error:', error.message);
      
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error connecting to central database',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}