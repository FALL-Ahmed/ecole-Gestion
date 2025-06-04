import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common'; // Import Query
import { AffectationService } from './affectation.service';
import { Affectation } from './affectation.entity';

@Controller('api/affectations')
export class AffectationController {
  constructor(private readonly affectationService: AffectationService) {}

  @Get()
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
  async findById(@Param('id') id: number): Promise<Affectation> {
    return this.affectationService.findById(id);
  }

  @Post()
  async create(@Body() data: { professeur_id: number; matiere_id: number; classe_id: number; annee_id: number }): Promise<Affectation> {
    return this.affectationService.create(data);
  }

  @Delete(':id')
  async delete(@Param('id') id: number): Promise<void> {
    return this.affectationService.delete(id);
  }
}
