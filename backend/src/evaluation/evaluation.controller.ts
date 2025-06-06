import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { EvaluationService } from './evaluation.service';
import { Evaluation } from './evaluation.entity';

@Controller('evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post()
  create(@Body() data: Partial<Evaluation>) {
    return this.evaluationService.create(data);
  }

  @Get()
  findAll() {
    return this.evaluationService.findAll();
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
