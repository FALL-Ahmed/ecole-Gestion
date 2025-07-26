import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, Repository } from 'typeorm';
import { AuditLog, ActionType } from './historique.entity';
import { User } from '../users/user.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

interface LogParams {
  userId: number;
  blocId: number;
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

  async findAll(blocId: number, queryDto: QueryAuditLogDto): Promise<AuditLog[]> {
    const { search, user, action, entity } = queryDto;

    const queryOptions: FindManyOptions<AuditLog> = {
      where: { blocId: blocId }, // Filtre de sécurité principal
      order: { timestamp: 'DESC' },
      relations: ['utilisateur'],
      take: 100, // Limiter pour la performance
    };

    // Ajout des filtres optionnels
    if (user) {
      const userIdAsNumber = parseInt(user, 10);
      if (!isNaN(userIdAsNumber)) {
        queryOptions.where = { ...queryOptions.where, userId: userIdAsNumber };
      }
    }
    if (action) {
      queryOptions.where = { ...queryOptions.where, action };
    }
    if (entity) {
      queryOptions.where = { ...queryOptions.where, entite: entity };
    }
    return this.auditLogRepository.find(queryOptions);
  }
}
