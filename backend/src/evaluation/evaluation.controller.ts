import { Controller, Post, Body, Get, Param, Delete, Query, ParseIntPipe, UseGuards, Put } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { Evaluation } from './evaluation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/evaluations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR)
  create(@Body() data: Partial<Evaluation>) {
    return this.evaluationService.create(data);
  }

  @Get()
  // CORRECTION : Autoriser tous les rôles pertinents à consulter les évaluations.
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  findAllFiltered(
    @Query('classeId', new ParseIntPipe({ optional: true })) classeId?: number,
    @Query('matiereId', new ParseIntPipe({ optional: true })) matiereId?: number,
    @Query('trimestre', new ParseIntPipe({ optional: true })) trimestreId?: number,
    @Query('annee_scolaire_id', new ParseIntPipe({ optional: true })) anneeScolaireId?: number,
  ) {
    return this.evaluationService.findAll(
      classeId,
      matiereId,
      trimestreId,
      anneeScolaireId,
    );
  }

  @Get(':id')
  // CORRECTION : Autoriser tous les rôles pertinents à consulter une évaluation spécifique.
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evaluationService.findOne(id);
  }


  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.evaluationService.remove(id);
  }
}