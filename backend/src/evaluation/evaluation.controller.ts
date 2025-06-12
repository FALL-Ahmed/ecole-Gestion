import { Controller, Post, Body, Get, Param, Delete, Query, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { Evaluation } from './evaluation.entity';

@Controller('api/evaluations')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  create(@Body() data: Partial<Evaluation>) {
    return this.evaluationService.create(data);
  }

  @Get()
  findAllFiltered(
    @Query('classeId') classeId?: string,
    @Query('matiereId') matiereId?: string,
    @Query('trimestre') trimestreId?: string,
    @Query('anneeScolaireId') anneeScolaireId?: string,
  ) {
    const parsedClasseId = classeId ? parseInt(classeId, 10) : undefined;
    const parsedMatiereId = matiereId ? parseInt(matiereId, 10) : undefined;
    const parsedTrimestreId = trimestreId ? parseInt(trimestreId, 10) : undefined;
    const parsedAnneeScolaireId = anneeScolaireId ? parseInt(anneeScolaireId, 10) : undefined;

   
    return this.evaluationService.findAll(
      parsedClasseId,
      parsedMatiereId,
      parsedTrimestreId,
      parsedAnneeScolaireId,
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evaluationService.findOne(id);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.evaluationService.remove(id);
  }
}