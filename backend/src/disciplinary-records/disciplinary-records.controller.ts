// src/disciplinary-records/disciplinary-records.controller.ts
import { Controller, Post, Body, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { DisciplinaryRecordsService } from './disciplinary-records.service';
import { CreateDisciplinaryRecordDto } from './dto/create-disciplinary-record.dto';

@Controller('api/disciplinary-records')
export class DisciplinaryRecordsController {
  constructor(private readonly service: DisciplinaryRecordsService) {}

  @Post()
  async create(@Body() createDto: CreateDisciplinaryRecordDto) {
    try {
      return await this.service.create(createDto);
    } catch (error) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: 'Erreur lors de la création de la sanction',
        details: error.message,
      }, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('class/:classId')
async findByClass(@Param('classId') classId: number) {
  const records = await this.service.findByClass(classId);
  if (records.length === 0) {
    return []; // Retourne un tableau vide au lieu d'erreur
  }
  return records;
}
}