import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { AuditSubscriber } from '../subscribers/audit.subscriber';
import * as path from 'path';

@Injectable()
export class TenantConnectionManager {
  private readonly connections = new Map<string, DataSource>();
  private readonly logger = new Logger(TenantConnectionManager.name);

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
      this.logger.log(`New connection established for tenant '${tenantId}' on db '${dbName}'`);
      return newDataSource;
    } catch (error) {
      this.logger.error(`Failed to initialize connection for tenant '${tenantId}' on db '${dbName}'`, error.stack);
      throw new HttpException('Failed to connect to tenant database.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Finds the database name for a tenant by querying the central database.
   * It can resolve a tenant from a subdomain or a blocId.
   * @param tenantId The identifier for the tenant (e.g., 'default', 'lycee1', or 'bloc_123').
   * @returns The database name or null if not found.
   */
  private async getTenantDbNameFromCentralDB(tenantId: string): Promise<string | null> {
    // Case 1: Local development or a default tenant
    if (tenantId === 'default') {
      return this.configService.get<string>('DB_DATABASE') || 'school_management';
    }

    // Case 2: Special identifier for the central admin portal.
    // This should not result in a tenant DB connection. Returning null is safe.
    if (tenantId === 'admin_portal') {
      return null;
    }

    // Case 3: Tenant identified by a bloc ID (from JWT)
    if (tenantId.startsWith('bloc_')) {
      const blocId = parseInt(tenantId.replace('bloc_', ''), 10);
      if (isNaN(blocId)) {
        this.logger.error(`Invalid blocId format: ${tenantId}`);
        return null;
      }

      try {
        // This query uses a central mapping table to find the school (and its db_name)
        // associated with a given bloc_id, without altering the tenant's 'blocs' table.
        const queryResult = await this.centralDataSource.query(
          `SELECT e.db_name 
           FROM ecoles e
           INNER JOIN bloc_ecole_mapping bem ON e.id = bem.ecole_id 
           WHERE bem.bloc_id = ?`,
          [blocId],
        );

        if (!queryResult || queryResult.length === 0) {
          this.logger.warn(`No ecole/db_name found in 'bloc_ecole_mapping' for blocId: ${blocId}`);
          return null;
        }
        return queryResult[0].db_name;
      } catch (error) {
        this.logger.error(`Error querying central DB for blocId '${blocId}'`, error.stack);
        throw new HttpException(
          'Error resolving tenant from bloc.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
    }

    // Case 4: Tenant identified by subdomain (from TenantMiddleware)
    try {
      const queryResult = await this.centralDataSource.query(
        `SELECT db_name FROM ecoles WHERE sous_domaine = ? LIMIT 1`,
        [tenantId],
      );

      if (!queryResult || queryResult.length === 0) {
        this.logger.warn(`No ecole/db_name found for subdomain: ${tenantId}`);
        return null;
      }

      return queryResult[0].db_name;
    } catch (error) {
      this.logger.error(`Error querying central DB for subdomain '${tenantId}'`, error.stack);
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
      entities: [path.join(__dirname, '/../**/*.entity{.ts,.js}')], // Trouve correctement toutes les entités
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
