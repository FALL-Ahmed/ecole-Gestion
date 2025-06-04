import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AnneeAcademiqueService } from './annee-academique.service';
import { CreateAnneeAcademiqueDto } from './create-annee-academique.dto';

@Controller('api/annees-academiques')
export class AnneeAcademiqueController {
  constructor(private readonly anneeService: AnneeAcademiqueService) {}

  @Get()
  getAll() {
    return this.anneeService.findAll();
  }

  @Get(':id')
  getOne(@Param('id') id: number) {
    return this.anneeService.findById(id);
  }

  @Post()
  create(@Body() data: CreateAnneeAcademiqueDto) {
    return this.anneeService.create(data);
  }
}
