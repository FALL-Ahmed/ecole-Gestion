import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './historique.entity';
import { AuditLogService } from './historique.service';
import { HistoriqueController } from './historique.controller';
import { AuditSubscriber } from '../subscribers/audit.subscriber';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog])],
  providers: [AuditLogService, AuditSubscriber],
  controllers: [HistoriqueController],
  exports: [AuditLogService],
})
export class AuditLogModule {}
