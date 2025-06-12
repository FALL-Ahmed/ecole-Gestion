import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { InscriptionService } from './inscription.service';
import { CreateInscriptionDto } from './dto/create-inscription.dto';

@Controller('api/inscriptions')
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  @Post()
  create(@Body() createDto: CreateInscriptionDto) {
    return this.inscriptionService.create(createDto);
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
  findOne(@Param('id') id: string) {
    return this.inscriptionService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.inscriptionService.remove(+id);
  }
}