import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AuditSubscriber } from '../subscribers/audit.subscriber';
import * as path from 'path';

@Injectable()
export class TenantConnectionManager {
  private readonly connections = new Map<string, DataSource>();

  constructor(
    @Inject('central') private readonly centralDataSource: DataSource,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieves or creates a DataSource for a given tenant.
   * Caches the DataSource to avoid creating new connections on every request.
   * @param tenantId The identifier for the tenant (e.g., 'default' or a subdomain).
   * @returns A promise that resolves to an initialized TypeORM DataSource.
   */
  async getDataSource(tenantId: string): Promise<DataSource> {
    if (this.connections.has(tenantId)) {
      const dataSource = this.connections.get(tenantId)!;
      // Ensure it's initialized, in case initialization failed before
      if (!dataSource.isInitialized) {
        await dataSource.initialize();
      }
      return dataSource;
    }

    const dbName = await this.getTenantDbNameFromCentralDB(tenantId);
    if (!dbName) {
      throw new HttpException(`Database for tenant '${tenantId}' not found.`, HttpStatus.NOT_FOUND);
    }

    const options = this.createDataSourceOptions(dbName);
    const newDataSource = new DataSource(options);
    
    try {
      await newDataSource.initialize();
      this.connections.set(tenantId, newDataSource);
      console.log(`[TenantConnectionManager] New connection established for tenant '${tenantId}' on db '${dbName}'`);
      return newDataSource;
    } catch (error) {
      console.error(`[TenantConnectionManager] Failed to initialize connection for tenant '${tenantId}' on db '${dbName}'`, error);
      throw new HttpException('Failed to connect to tenant database.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Finds the database name for a tenant by querying the central database.
   * @param tenantId The identifier for the tenant.
   * @returns The database name or null if not found.
   */
  private async getTenantDbNameFromCentralDB(tenantId: string): Promise<string | null> {
    if (tenantId === 'default') {
      // For local development or a default tenant
      return this.configService.get<string>('DB_NAME') || 'school_management';
    }

    try {
      // Use '?' for mysql2 parameter binding to prevent SQL injection
      const queryResult = await this.centralDataSource.query(
        `SELECT db_name FROM ecoles WHERE sous_domaine = ? LIMIT 1`,
        [tenantId],
      );

      if (!queryResult || queryResult.length === 0) {
        return null;
      }

      return queryResult[0].db_name;
    } catch (error) {
      console.error(`[TenantConnectionManager] Error querying central DB for tenant '${tenantId}'`, error);
      throw new HttpException('Error connecting to central database to resolve tenant.', HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /**
   * Creates the configuration object for a new tenant DataSource.
   * @param database The name of the tenant's database.
   * @returns A TypeORM DataSourceOptions object.
   */
  private createDataSourceOptions(database: string): DataSourceOptions {
    return {
      name: database, // Give each connection a unique name to avoid conflicts
      type: 'mysql',
      host: this.configService.get<string>('DB_HOST'),
      port: this.configService.get<number>('DB_PORT'),
      username: this.configService.get<string>('DB_USER'),
      password: this.configService.get<string>('DB_PASSWORD'),
      database,
      entities: [path.join(__dirname, '/../**/*.entity{.ts,.js}')],
      synchronize: false,
      logging: false,
      subscribers: [AuditSubscriber],
      ssl: this.configService.get('DB_SSL') === 'true' 
          ? { rejectUnauthorized: false } 
          : undefined,
      extra: {
        waitForConnections: true,
        connectionLimit: 10, // A reasonable pool size per tenant
        queueLimit: 0,
      },
    };
  }
}

