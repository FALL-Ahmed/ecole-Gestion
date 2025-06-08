// src/evaluation/evaluation.controller.ts
import { Controller, Post, Body, Get, Param, Delete, Query } from '@nestjs/common'; // Import Query
import { EvaluationService } from './evaluation.service';
import { Evaluation } from './evaluation.entity';

@Controller('api/evaluations') // IMPORTANT: Changed to 'api/evaluations' to match frontend path
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  create(@Body() data: Partial<Evaluation>) {
    return this.evaluationService.create(data);
  }

  // Modified GET route to accept query parameters
  @Get()
  findAllFiltered( // Renamed to avoid confusion with the previous `findAll` that took no args
    @Query('classeId') classeId?: string,
    @Query('matiereId') matiereId?: string,
    @Query('trimestre') trimestre?: string,
    @Query('anneeScolaireId') anneeScolaireId?: string,
  ) {
    // Parse string query parameters to numbers where necessary
    const parsedClasseId = classeId ? parseInt(classeId, 10) : undefined;
    const parsedMatiereId = matiereId ? parseInt(matiereId, 10) : undefined;
    const parsedAnneeScolaireId = anneeScolaireId ? parseInt(anneeScolaireId, 10) : undefined;

    // Call the service with the parsed parameters
    return this.evaluationService.findAll(
      parsedClasseId,
      parsedMatiereId,
      trimestre, // Trimestre is already a string
      parsedAnneeScolaireId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluationService.findOne(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluationService.remove(+id);
  }
}