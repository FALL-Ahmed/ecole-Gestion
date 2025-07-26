// src/exception-emploi-du-temps/exception-emploi-du-temps.controller.ts
import { Controller, Get, Post, Body, Param, Delete, Query, UsePipes, ValidationPipe, Put, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ExceptionEmploiDuTempsService } from './exceptionemploidutemps.service';
import { CreateExceptionEmploiDuTempsDto } from './dto/create-exception-emploi-du-temps.dto';
import { UpdateExceptionEmploiDuTempsDto } from './dto/update-exception-emploi-du-temps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/exception-emploi-du-temps') // URL de base: /api/exception-emploi-du-temps
@UseGuards(JwtAuthGuard, RolesGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true })) // Active la validation des DTOs
export class ExceptionEmploiDuTempsController {
  constructor(private readonly exceptionEmploiDuTempsService: ExceptionEmploiDuTempsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createExceptionEmploiDuTempsDto: CreateExceptionEmploiDuTempsDto) {
    return this.exceptionEmploiDuTempsService.create(createExceptionEmploiDuTempsDto);
  }

  // --- MODIFIED: findAll to accept optional query parameters for filtering ---
  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  findAll(
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
    @Query('classe_id', new ParseIntPipe({ optional: true })) classeId?: number,
    @Query('professeur_id', new ParseIntPipe({ optional: true })) professeurId?: number,
  ) {
    // The service now handles the filters directly.
    return this.exceptionEmploiDuTempsService.findAll({
      startDate,
      endDate,
      classeId,
      professeurId,
    });
  }
  // --- END MODIFIED ---

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent', UserRole.ETUDIANT)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.exceptionEmploiDuTempsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() updateExceptionEmploiDuTempsDto: UpdateExceptionEmploiDuTempsDto) {
    return this.exceptionEmploiDuTempsService.update(id, updateExceptionEmploiDuTempsDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.exceptionEmploiDuTempsService.remove(id);
  }

}