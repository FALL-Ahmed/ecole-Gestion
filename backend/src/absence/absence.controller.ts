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
  Req,
} from '@nestjs/common';
import { AbsenceService } from './absence.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';
import { BulkCreateAbsenceDto } from './dto/bulk-create-absence.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/absences')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AbsenceController {
  constructor(private readonly absenceService: AbsenceService) {}

  @Post()  
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR )
  create(@Body() createAbsenceDto: CreateAbsenceDto) {
    return this.absenceService.create(createAbsenceDto);
  }

  @Post('bulk')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR )
  createOrUpdateBulk(@Body() bulkDto: BulkCreateAbsenceDto) {
    return this.absenceService.createOrUpdateBulk(bulkDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  findAll(
    @Query('classe_id', new ParseIntPipe({ optional: true })) classe_id?: number,
    @Query('annee_scolaire_id', new ParseIntPipe({ optional: true })) annee_scolaire_id?: number,
    @Query('date_debut') date_debut?: string,
    @Query('date_fin') date_fin?: string,
    @Query('date') date?: string,
    @Query('etudiant_id', new ParseIntPipe({ optional: true })) etudiant_id?: number,
    @Query('matiere_id', new ParseIntPipe({ optional: true })) matiere_id?: number,
    @Query('heure_debut') heure_debut?: string,
    @Query('heure_fin') heure_fin?: string,
    @Query('search') search?: string,
  ) {
    // Clarification de la logique de date:
    // Si 'date' est fourni, il est utilisé pour une recherche sur un jour unique et a la priorité.
    // Sinon, 'date_debut' et 'date_fin' sont utilisés pour une recherche sur une période.
    let final_date_debut = date_debut;
    let final_date_fin = date_fin;

    if (date) {
      final_date_debut = date;
      final_date_fin = undefined; // Assure que la recherche se fait sur un seul jour
    }

    return this.absenceService.findAll(
      classe_id,
      annee_scolaire_id,
      final_date_debut,
      final_date_fin,
      etudiant_id,
      matiere_id,
      heure_debut,
      heure_fin,
      search,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.absenceService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAbsenceDto: UpdateAbsenceDto,
  ) {
    return this.absenceService.update(id, updateAbsenceDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR )
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.absenceService.remove(id);
  }
}
