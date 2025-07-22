import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AffectationService } from './affectation.service';
import { Affectation } from './affectation.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/affectations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AffectationController {
  constructor(private readonly affectationService: AffectationService) {}

  @Get()
  // Accessible à tous les utilisateurs authentifiés (admin, prof, etc.)
  async findAll(
    @Query('professeurId') professeurId?: number,
    
  ): Promise<Affectation[]> {
    console.log('🔎 Requête findAll avec professeurId:', professeurId);
    
    if (professeurId) {
      return this.affectationService.findByProfesseurId(professeurId);
    }
    return this.affectationService.findAll();
  }

  @Get(':id')
  // Accessible à tous les utilisateurs authentifiés
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Affectation> {
    return this.affectationService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN) // Seuls les administrateurs peuvent créer des affectations
  async create(@Body() data: { professeur_id: number; matiere_id: number; classe_id: number; annee_id: number }): Promise<Affectation> {
    return this.affectationService.create(data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Seuls les administrateurs peuvent supprimer
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.affectationService.delete(id);
  }
}
