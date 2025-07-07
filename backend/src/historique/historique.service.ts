import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, ActionType } from './historique.entity';
import { User } from '../users/user.entity';

interface LogParams {
  userId: number;
  action: ActionType;
  entite: string;
  entiteId: number;
  description: string;
  details?: any;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
  ) {}

  async logAction(params: LogParams): Promise<void> {
    const logEntry = this.auditLogRepository.create({
      ...params,
      utilisateur: { id: params.userId } as User, // Attach user by id
    });
    await this.auditLogRepository.save(logEntry);
  }
}
