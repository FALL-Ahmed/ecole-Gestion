import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './historique.service';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditLog } from './historique.entity';
import { Repository, FindManyOptions } from 'typeorm';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

@Controller('api/historique')
export class HistoriqueController {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  @Get()
  async findAll(@Query() queryDto: QueryAuditLogDto) {
    const { search, user, action, entity } = queryDto;
    const queryOptions: FindManyOptions<AuditLog> = {
      order: { timestamp: 'DESC' },
      relations: ['utilisateur'],
      take: 100, // Limiter pour la performance
    };

    // Ici, vous ajouteriez la logique de filtrage en fonction des queryDto
    // Exemple: if (user) { queryOptions.where = { ...queryOptions.where, userId: user }; }
    return this.auditLogRepository.find(queryOptions);
  }
}
