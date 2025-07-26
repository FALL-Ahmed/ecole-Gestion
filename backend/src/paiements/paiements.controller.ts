// paiements.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Put,
  Param,
  UsePipes,
  ValidationPipe,
  HttpException,
  HttpStatus,
  BadRequestException,
  ParseIntPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaiementService } from './paiements.service';
import { FindPaiementsQueryDto } from './dto/find-paiements-query.dto';
import { EnregistrerPaiementDto } from './dto/enregistrer-paiement.dto';
import { Paiement } from './paiements.entity';
import { RappelPaiementService } from './rappel-paiement.service';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/paiements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaiementController {
  constructor(
    private readonly paiementService: PaiementService,
    private readonly rappelPaiementService: RappelPaiementService, // Injection directe
  ) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAllByClasse(@Query() query: FindPaiementsQueryDto): Promise<any[]> {
    return this.paiementService.findAllByClasse(query);
  }

@Get('envoyer-rappel')
@Roles(UserRole.ADMIN)
async envoyerRappel(
  @Query('eleveId', ParseIntPipe) eleveId: number,
  @Query('mois') mois: string,
) {
  // La logique de try/catch est supprimée. Le service lèvera directement
  // une HttpException (comme BadRequestException ou InternalServerErrorException),
  // qui sera gérée par le filtre d'exception global de NestJS.
  const result = await this.rappelPaiementService.envoyerRappelManuel(eleveId, mois);
  if (!result.success) {
    throw new BadRequestException(result.message);
  }
  return result;
}
@Put(':id')
@Roles(UserRole.ADMIN)
async update(
  @Param('id', ParseIntPipe) id: number,
  @Body() updatePaiementDto: EnregistrerPaiementDto,
): Promise<Paiement> {
  return this.paiementService.updatePaiement(id, updatePaiementDto);
}

  @Get('historique/eleve/:eleveId')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent')
  findHistorique(
    @Param('eleveId', ParseIntPipe) eleveId: number,
    @Query('anneeScolaireId', ParseIntPipe) anneeScolaireId: number,
  ): Promise<Paiement[]> {
    return this.paiementService.findHistoriqueByEleve(eleveId, anneeScolaireId);
  }

  @Post('enregistrer')
  @Roles(UserRole.ADMIN)
  enregistrer(@Body() enregistrerPaiementDto: EnregistrerPaiementDto): Promise<Paiement> {
    return this.paiementService.enregistrerPaiement(enregistrerPaiementDto);
  }
}