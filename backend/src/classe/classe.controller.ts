import { Controller, Get, Post, Param, Body, Put, Delete, Query } from '@nestjs/common';
import { ClasseService } from './classe.service';
import { Classe, Niveau } from './classe.entity';

@Controller('api/classes')
export class ClasseController {
  constructor(private readonly classeService: ClasseService) {}

  @Get()
  async getAllClasses(@Query('anneeScolaireId') anneeScolaireId?: number): Promise<Classe[]> {
    if (anneeScolaireId) {
      return this.classeService.findByAnneeScolaire(Number(anneeScolaireId));
    }
    return this.classeService.findAll();
  }

  @Get(':id')
  async getClasseById(@Param('id') id: number): Promise<Classe> {
    return this.classeService.findById(id);
  }

  @Post()
  async createClasse(
    @Body() data: { 
      nom: string; 
      niveau: Niveau;
      description?: string;
      anneeScolaireId: number;
      frais_scolarite: number;
    },
  ): Promise<Classe> {
    return this.classeService.createClasse(data);
  }

  @Put(':id')
  async updateClasse(
    @Param('id') id: number,
    @Body() data: Partial<Classe>,
  ): Promise<Classe> {
    return this.classeService.updateClasse(id, data);
  }

  @Delete(':id')
  async deleteClasse(@Param('id') id: number): Promise<void> {
    return this.classeService.deleteClasse(id);
  }
}