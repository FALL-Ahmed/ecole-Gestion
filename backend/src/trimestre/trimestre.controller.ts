
import { Controller, Post, Body, Get } from '@nestjs/common';
import { TrimestreService } from './trimestre.service';
import { CreateTrimestreDto } from './create-trimestre.dto';
import { Query } from '@nestjs/common';
import { Trimestre } from './trimestre.entity';

@Controller('api/trimestres')
export class TrimestreController {
  constructor(private readonly trimestreService: TrimestreService) {}

  @Post()
  create(@Body() dto: CreateTrimestreDto) {
    return this.trimestreService.create(dto);
  }

  

   @Get()
  async findAll(@Query('anneeScolaireId') anneeScolaireId?: string): Promise<Trimestre[]> {
    // Convertir anneeScolaireId en nombre si elle est fournie
    const parsedAnneeScolaireId = anneeScolaireId ? parseInt(anneeScolaireId, 10) : undefined;
    return this.trimestreService.findAll(parsedAnneeScolaireId);
  }

  @Get('by-date')
async findByDate(
  @Query('date') date: string,
  @Query('anneeId') anneeId: number,
) {
  return this.trimestreService.findByDate(date, anneeId);
}
}
