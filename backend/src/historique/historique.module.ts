import { Module } from '@nestjs/common';
import { AuditLog } from './historique.entity';
import { AuditLogService } from './historique.service';
import { HistoriqueController } from './historique.controller';
import { AuditSubscriber } from '../subscribers/audit.subscriber';
import { createTenantRepositoryProvider } from '../tenant/tenant-repository.provider';

@Module({
  imports: [],
  providers: [
    AuditLogService,
    AuditSubscriber,
    createTenantRepositoryProvider(AuditLog),
  ],
  controllers: [HistoriqueController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
