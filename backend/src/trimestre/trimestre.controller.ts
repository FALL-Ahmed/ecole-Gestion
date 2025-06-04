
import { Controller, Post, Body, Get } from '@nestjs/common';
import { TrimestreService } from './trimestre.service';
import { CreateTrimestreDto } from './create-trimestre.dto';

@Controller('api/trimestres')
export class TrimestreController {
  constructor(private readonly trimestreService: TrimestreService) {}

  @Post()
  create(@Body() dto: CreateTrimestreDto) {
    return this.trimestreService.create(dto);
  }

  @Get()
  findAll() {
    return this.trimestreService.findAll();
  }
}
