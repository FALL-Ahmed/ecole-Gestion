import { Controller, Get, Post, Body, Put, Param, Query, UseGuards } from '@nestjs/common';
import { ProfessorAbsencesService } from './professor-absence.service';
// import { AuthGuard } from '@nestjs/passport';

// @UseGuards(AuthGuard('jwt'))
@Controller('api/professor-absences')
export class ProfessorAbsencesController {
  constructor(private readonly absencesService: ProfessorAbsencesService) {}

  @Get()
async findAll(@Query() query: any) {
  // Valider et formater les dates si nécessaire
  if (query.date_debut && query.date_fin) {
    query.date_debut = new Date(query.date_debut).toISOString().split('T')[0];
    query.date_fin = new Date(query.date_fin).toISOString().split('T')[0];
  }
  return this.absencesService.findAll(query);
}
  @Post('bulk')
  createOrUpdateBulk(@Body() body: { date: string; annee_scolaire_id: number; details: any[] }) {
    return this.absencesService.createOrUpdateBulk(body);
  }

  

  @Put(':id')
  update(@Param('id') id: string, @Body() body: { justifie: boolean; justification: string }) {
    return this.absencesService.update(+id, body);
  }
}

