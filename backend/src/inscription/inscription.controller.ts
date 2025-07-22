import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/inscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateInscriptionDto) {
    return this.inscriptionService.create(createDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateDto: Partial<CreateInscriptionDto>) {
    return this.inscriptionService.update(id, updateDto);
  }

  @Get()
  // Accepte maintenant utilisateurId, classeId et anneeScolaireId comme paramètres de requête.
  // Ces noms correspondent directement aux noms des colonnes de votre table Inscription.
  findAll(
    @Query('utilisateurId') utilisateurId?: string,
    @Query('classeId') classeId?: string,
    @Query('anneeScolaireId') anneeScolaireId?: string
  ) {
    // Crée un objet de filtres qui sera passé au service.
    // Convertit les chaînes en nombres si elles sont présentes.
    const filters: { utilisateurId?: number; classeId?: number; anneeScolaireId?: number } = {};

    if (utilisateurId) {
      filters.utilisateurId = +utilisateurId;
    }
    if (classeId) {
      filters.classeId = +classeId;
    }
    if (anneeScolaireId) {
      filters.anneeScolaireId = +anneeScolaireId;
    }

    // Appelle la méthode findAll du service qui est maintenant plus flexible
    return this.inscriptionService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inscriptionService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.inscriptionService.remove(id);
  }
}