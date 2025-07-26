import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuditLogService } from './historique.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

interface UserPayload {
  userId: number;
  email: string;
  role: UserRole;
  blocId: number;
}

interface RequestWithUser extends Request {
  user: UserPayload;
}

@Controller('api/historique')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class HistoriqueController {
  constructor(
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get()
  async findAll(
    @Query() queryDto: QueryAuditLogDto,
    @Req() req: RequestWithUser,
  ) {
    const { blocId } = req.user;
    return this.auditLogService.findAll(blocId, queryDto);
  }
}
