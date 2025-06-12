// src/exception-emploi-du-temps/exception-emploi-du-temps.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UsePipes, ValidationPipe, Put } from '@nestjs/common';
import { ExceptionEmploiDuTempsService } from './exceptionemploidutemps.service';
import { CreateExceptionEmploiDuTempsDto } from './dto/create-exception-emploi-du-temps.dto';
import { UpdateExceptionEmploiDuTempsDto } from './dto/update-exception-emploi-du-temps.dto';

@Controller('api/exception-emploi-du-temps') // URL de base: /api/exception-emploi-du-temps
@UsePipes(new ValidationPipe({ whitelist: true, transform: true })) // Active la validation des DTOs
export class ExceptionEmploiDuTempsController {
  constructor(private readonly exceptionEmploiDuTempsService: ExceptionEmploiDuTempsService) {}

  @Post()
  create(@Body() createExceptionEmploiDuTempsDto: CreateExceptionEmploiDuTempsDto) {
    return this.exceptionEmploiDuTempsService.create(createExceptionEmploiDuTempsDto);
  }

  // --- MODIFIED: findAll to accept optional query parameters for filtering ---
  @Get()
  findAll(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('classe_id') classeId?: string,
    @Query('professeur_id') professeurId?: string,
  ) {
    const filters: {
      startDate?: string;
      endDate?: string;
      classeId?: number;
      professeurId?: number;
    } = {};

    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }
    if (classeId) {
      filters.classeId = +classeId;
    }
    if (professeurId) {
      filters.professeurId = +professeurId;
    }
    
    // If no date filters are provided, ensure it still works (e.g., return all or apply default)
    // For the frontend's use case, startDate/endDate are usually provided.
    return this.exceptionEmploiDuTempsService.findAll(filters);
  }
  // --- END MODIFIED ---

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exceptionEmploiDuTempsService.findOne(+id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateExceptionEmploiDuTempsDto: UpdateExceptionEmploiDuTempsDto) {
    return this.exceptionEmploiDuTempsService.update(+id, updateExceptionEmploiDuTempsDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.exceptionEmploiDuTempsService.remove(+id);
  }

  // --- REMOVED: by-period as it is now handled by the modified findAll ---
  // @Get('by-period')
  // findExceptionsByPeriod(
  //   @Query('startDate') startDate: string,
  //   @Query('endDate') endDate: string,
  //   @Query('classeId') classeId?: string,
  //   @Query('professeurId') professeurId?: string,
  // ) {
  //   if (!startDate || !endDate) {
  //     throw new Error('startDate and endDate query parameters are required.');
  //   }
  //   return this.exceptionEmploiDuTempsService.findExceptionsByPeriod(
  //     startDate,
  //     endDate,
  //     classeId ? +classeId : undefined,
  //     professeurId ? +professeurId : undefined,
  //   );
  // }
}