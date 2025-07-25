import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, UsePipes, ValidationPipe, Put } from '@nestjs/common';
import { ChapitreService } from './chapitre.service';
import { CreateChapitreDto } from './dto/create-chapitre.dto';
import { UpdateChapitreDto } from './dto/update-chapitre.dto';
import { Chapitre } from './chapitre.entity';

@Controller('api/chapitres')
export class ChapitreController {
  constructor(private readonly chapitreService: ChapitreService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  create(@Body() createChapitreDto: CreateChapitreDto): Promise<Chapitre> {
    return this.chapitreService.create(createChapitreDto);
  }

  @Get()
  findAll(
    // @Query('professeur_id') professeurId?: string, // Retiré
    // @Query('annee_scolaire_id') anneeScolaireId?: string, // Retiré
    @Query('classe_id') classeId?: string,
    @Query('matiere_id') matiereId?: string,
  ): Promise<Chapitre[]> {
    const queryParams: any = {};
    if (classeId) queryParams.classe_id = classeId;
    if (matiereId) queryParams.matiere_id = matiereId;
    
    return this.chapitreService.findAll(queryParams);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Chapitre> {
    return this.chapitreService.findOne(id);
  }

  @Put(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  update(@Param('id', ParseIntPipe) id: number, @Body() updateChapitreDto: UpdateChapitreDto): Promise<Chapitre> {
    return this.chapitreService.update(id, updateChapitreDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.chapitreService.remove(id);
  }
}
