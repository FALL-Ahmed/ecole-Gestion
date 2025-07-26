import { Controller, Get, Post, Param, Body, Put, Delete, Query, UseGuards, UsePipes, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { ClasseService } from './classe.service';
import { Classe, Niveau } from './classe.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../users/user.entity';
import { CreateClasseDto } from './dto/create-classe.dto';
import { UpdateClasseDto } from './dto/update-classe.dto';

import { Roles } from '../auth/roles.decorator';

@Controller('api/classes')
@UseGuards(JwtAuthGuard, RolesGuard) // Protège et vérifie les rôles pour toutes les routes
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true, // Active la transformation automatique des types
    transformOptions: { enableImplicitConversion: true }, // Permet la conversion implicite (ex: string -> number)
  }),
)


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
  async getClasseById(@Param('id', ParseIntPipe) id: number): Promise<Classe> {
    return this.classeService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent créer
  async createClasse(
        @Body() createClasseDto: CreateClasseDto,

  ): Promise<Classe> {
    return this.classeService.createClasse(createClasseDto);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent modifier
  async updateClasse(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateClasseDto: UpdateClasseDto,
  ): Promise<Classe> {
    return this.classeService.updateClasse(id, updateClasseDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN) // Seuls les admins peuvent supprimer
  async deleteClasse(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.classeService.deleteClasse(id);
  }
}