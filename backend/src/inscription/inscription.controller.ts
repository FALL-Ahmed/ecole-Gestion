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
  
  // Ici on récupère les query params pour filtrer
  @Get()
  findAll(@Query('classeId') classeId?: string, @Query('anneeScolaireId') anneeScolaireId?: string) {
    if (classeId && anneeScolaireId) {
      // Parse en number et appelle le service avec filtre
      return this.inscriptionService.findByClasseAndAnnee(+classeId, +anneeScolaireId);
    }
    // Sinon retourne tout
    return this.inscriptionService.findAll();
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
