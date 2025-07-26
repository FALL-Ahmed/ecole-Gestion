import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
// Removed Req, ForbiddenException, Optional
import { AffectationService } from './affectation.service';
import { Affectation } from './affectation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Removed UserPayload, RequestWithUser, and getBlocId function

@Controller('api/affectations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AffectationController {
  constructor(private readonly affectationService: AffectationService) {}

  @Get()
  @Roles(UserRole.ADMIN, 'parent', UserRole.PROFESSEUR, UserRole.ETUDIANT)
  async findAll(
    // Removed @Req() and queryBlocId
    @Query('classe_id', new ParseIntPipe({ optional: true })) classe_id?: number,
    @Query('professeurId', new ParseIntPipe({ optional: true })) professeurId?: number,
    @Query('annee_scolaire_id', new ParseIntPipe({ optional: true })) annee_scolaire_id?: number,
  ): Promise<Affectation[]> {
    if (professeurId) {
      return this.affectationService.findByProfesseurId(professeurId, annee_scolaire_id);
    }
    return this.affectationService.findAll(annee_scolaire_id, classe_id);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, 'parent')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Affectation> {
    return this.affectationService.findById(id); 
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async create(
    @Body() data: { professeur_id: number; matiere_id: number; classe_id: number; annee_scolaire_id: number },
  ): Promise<Affectation> {
    return this.affectationService.create(data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.affectationService.delete(id);
  }
}
