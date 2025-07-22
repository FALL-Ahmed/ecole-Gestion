import { Controller, Get, Post, Param, Body, Put, Delete, Query, UseGuards } from '@nestjs/common';
import { ClasseService } from './classe.service';
import { Classe, Niveau } from './classe.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { Roles } from '../auth/roles.decorator';

@Controller('api/classes')
@UseGuards(JwtAuthGuard, RolesGuard) // Protège et vérifie les rôles pour toutes les routes
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
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent créer
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
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent modifier
  async updateClasse(
    @Param('id') id: number,
    @Body() data: Partial<Classe>,
  ): Promise<Classe> {
    return this.classeService.updateClasse(id, data);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent supprimer
  async deleteClasse(@Param('id') id: number): Promise<void> {
    return this.classeService.deleteClasse(id);
  }
}