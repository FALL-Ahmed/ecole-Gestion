import { Controller, Get, UseGuards, Req, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ParentSearchService } from './parent-search.service';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FoundChildDto } from './dto/found-child.dto';

@ApiTags('Parents')
@Controller('api/parents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParentSearchController {
  private readonly logger = new Logger(ParentSearchController.name);

  constructor(private readonly parentSearchService: ParentSearchService) {}

  @Get('rechercher-enfants')
  @Roles('parent')
  @ApiOperation({ summary: "Recherche les enfants d'un parent dans toutes les écoles" })
  @ApiResponse({ status: 200, description: 'Liste des enfants trouvés', type: [FoundChildDto] })
  findMyChildren(@Req() req: Request) {
    const parentId = (req.user as any).id;
    this.logger.log(`Début de la recherche d'enfants pour le parent ID: ${parentId}`);
    return this.parentSearchService.findChildrenAcrossAllEcoles(parentId);
  }
}

