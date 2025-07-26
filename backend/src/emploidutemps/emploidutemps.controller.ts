import { Controller, Get, Post, Body, Param, Delete, Query, Put, UseGuards, ParseIntPipe } from '@nestjs/common';
// Removed Req, ForbiddenException
import { EmploiDuTempsService } from './emploidutemps.service';
import { CreateEmploiDuTempsDto } from './dto/create-emploi-du-temps.dto';
import { UpdateEmploiDuTempsDto } from './dto/update-emploi-du-temps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

// Removed helper interfaces and functions

@Controller('api/emploi-du-temps') // Base URL: /api/emploi-du-temps
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmploiDuTempsController {
  constructor(private readonly emploiDuTempsService: EmploiDuTempsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createEmploiDuTempsDto: CreateEmploiDuTempsDto) {
    return this.emploiDuTempsService.create(createEmploiDuTempsDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  findAll(
    @Query('classe_id', new ParseIntPipe({ optional: true })) classeId?: number,
    @Query('professeur_id', new ParseIntPipe({ optional: true })) professeurId?: number,
    @Query('annee_academique_id', new ParseIntPipe({ optional: true })) anneeAcademiqueId?: number,
    // blocId from query is now handled by the service
  ) {
    const filters: { classeId?: number; professeurId?: number; anneeAcademiqueId?: number } = {};

    if (classeId) filters.classeId = classeId;
    if (professeurId) filters.professeurId = professeurId;
    if (anneeAcademiqueId) filters.anneeAcademiqueId = anneeAcademiqueId;

    return this.emploiDuTempsService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.emploiDuTempsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEmploiDuTempsDto: UpdateEmploiDuTempsDto,
  ) {
    return this.emploiDuTempsService.update(id, updateEmploiDuTempsDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.emploiDuTempsService.remove(id);
  }
}