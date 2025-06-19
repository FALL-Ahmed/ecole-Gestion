import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { MatiereService } from './matiere.service';
import { Matiere } from './matiere.entity';


@Controller('api/matieres')
export class MatiereController {
  constructor(private readonly matiereService: MatiereService) {}

  @Get()
  findAll(): Promise<Matiere[]> {
    return this.matiereService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Matiere | null> {
    return this.matiereService.findOne(Number(id));
  }

  @Post()
  create(@Body() data: Partial<Matiere>): Promise<Matiere> {
    return this.matiereService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: Partial<Matiere>): Promise<Matiere> {
    return this.matiereService.update(Number(id), data);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.matiereService.remove(Number(id));
  }
}