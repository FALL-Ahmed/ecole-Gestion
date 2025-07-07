import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { BulkCreateAbsenceDto } from './dto/bulk-create-absence.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/absences')
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  // ✅ Créer une absence (avec utilisateur pour log)
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req: any, @Body() createAbsenceDto: CreateAbsenceDto) {
    const utilisateurId = req.user.id;
    return this.absenceService.create(createAbsenceDto, utilisateurId);
  }

  // ✅ Créer ou modifier en masse
  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  createOrUpdateBulk(@Request() req: any, @Body() bulkDto: BulkCreateAbsenceDto) {
    const utilisateurId = req.user.id;
    return this.absenceService.createOrUpdateBulk(bulkDto, utilisateurId);
  }

  // ✅ Récupérer toutes les absences (public ou protégé à toi de décider)
  @Get()
  findAll(
    @Query('classe_id') classe_id?: string,
    @Query('annee_scolaire_id') annee_scolaire_id?: string,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin') date_fin?: string,
    @Query('date') date?: string,
    @Query('etudiant_id') etudiant_id?: string,
    @Query('matiere_id') matiere_id?: string,
    @Query('heure_debut') heure_debut?: string,
    @Query('heure_fin') heure_fin?: string,
    @Query('search') search?: string,
  ) {
    const debut = date || date_debut;
    const fin = date ? undefined : date_fin;

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

  // ✅ Récupérer une absence par ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.absenceService.findOne(id);
  }

  // ✅ Mettre à jour une absence
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAbsenceDto: UpdateAbsenceDto,
  ) {
    const utilisateurId = req.user.id;
    return this.absenceService.update(id, updateAbsenceDto, utilisateurId);
  }

  // ✅ Supprimer une absence
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const utilisateurId = req.user.id;
    return this.absenceService.remove(id, utilisateurId);
  }
}
