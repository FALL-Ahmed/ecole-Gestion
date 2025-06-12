// src/emploi-du-temps/emploi-du-temps.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Query, Put } from '@nestjs/common'; // Removed Patch
import { EmploiDuTempsService } from './emploidutemps.service';
import { CreateEmploiDuTempsDto } from './dto/create-emploi-du-temps.dto';
import { UpdateEmploiDuTempsDto } from './dto/update-emploi-du-temps.dto';

@Controller('api/emploi-du-temps') // Base URL: /api/emploi-du-temps
export class EmploiDuTempsController {
  constructor(private readonly emploiDuTempsService: EmploiDuTempsService) {}

  @Post()
  create(@Body() createEmploiDuTempsDto: CreateEmploiDuTempsDto) {
    return this.emploiDuTempsService.create(createEmploiDuTempsDto);
  }

  // --- MODIFIED: findAll to accept optional query parameters for filtering ---
  @Get()
  findAll(
    @Query('classe_id') classeId?: string,
    @Query('professeur_id') professeurId?: string,
    @Query('annee_academique_id') anneeAcademiqueId?: string,
  ) {
    const filters: { classeId?: number; professeurId?: number; anneeAcademiqueId?: number } = {};

    if (classeId) {
      filters.classeId = +classeId;
    }
    if (professeurId) {
      filters.professeurId = +professeurId;
    }
    if (anneeAcademiqueId) {
      filters.anneeAcademiqueId = +anneeAcademiqueId;
    }

    return this.emploiDuTempsService.findAll(filters);
  }
  // --- END MODIFIED ---

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.emploiDuTempsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateEmploiDuTempsDto: UpdateEmploiDuTempsDto) {
    return this.emploiDuTempsService.update(+id, updateEmploiDuTempsDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.emploiDuTempsService.remove(+id);
  }

  // --- REMOVED: by-class and by-teacher as they are now handled by findAll ---
  // @Get('by-class')
  // findByClass(
  //   @Query('classeId') classeId: string,
  //   @Query('anneeAcademiqueId') anneeAcademiqueId: string
  // ) {
  //   if (!classeId) {
  //     throw new Error('classeId query parameter is required.');
  //   }
  //   return this.emploiDuTempsService.findByClassAndYear(+classeId, +anneeAcademiqueId);
  // }

  // @Get('by-teacher')
  // findByTeacher(@Query('professeurId') professeurId: string) {
  //   if (!professeurId) {
  //     throw new Error('professeurId query parameter is required.');
  //   }
  //   return this.emploiDuTempsService.findByTeacher(+professeurId);
  // }
}