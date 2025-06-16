import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, Put } from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { BulkCreateAbsenceDto } from './dto/bulk-create-absence.dto';

@Controller('api/absences')
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Post()
  create(@Body() createAbsenceDto: CreateAbsenceDto) {
    return this.absenceService.create(createAbsenceDto);
  }

  @Post('bulk')
  createOrUpdateBulk(@Body() bulkDto: BulkCreateAbsenceDto) {
    return this.absenceService.createOrUpdateBulk(bulkDto);
  }

  @Get()
  findAll(
    @Query('classe_id') classe_id?: string,
    @Query('annee_scolaire_id') annee_scolaire_id?: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin') date_fin?: string,
    @Query('date') date?: string, // Pour récupérer les absences d'une date spécifique (utilisé par le frontend)
    @Query('etudiant_id') etudiant_id?: string,
    @Query('matiere_id') matiere_id?: string,
    @Query('heure_debut') heure_debut?: string,
    @Query('heure_fin') heure_fin?: string,
    @Query('search') search?: string,
  ) {
    // Si 'date' est fourni, il a priorité sur date_debut/date_fin pour la recherche d'une date unique
    const debut = date || date_debut;
    const fin = date ? undefined : date_fin; // Si 'date' est là, on ne veut pas de range

    return this.absenceService.findAll(
      classe_id ? +classe_id : undefined,
      annee_scolaire_id ? +annee_scolaire_id : undefined,
      debut,
      fin,
      etudiant_id ? +etudiant_id : undefined,
      matiere_id ? +matiere_id : undefined,
      heure_debut,
      heure_fin,
      search,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.absenceService.findOne(id);
  }

  @Put(':id') // Utiliser PUT pour la mise à jour complète de la justification
  update(@Param('id', ParseIntPipe) id: number, @Body() updateAbsenceDto: UpdateAbsenceDto) {
    // On ne met à jour que la justification et le statut justifié
    return this.absenceService.update(id, {
        justifie: updateAbsenceDto.justifie,
        justification: updateAbsenceDto.justification
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.absenceService.remove(id);
  }
}
