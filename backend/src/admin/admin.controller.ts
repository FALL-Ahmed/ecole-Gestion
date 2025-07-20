import { Controller, Get, Post, Body, UseGuards, ValidationPipe, Put, Param, ParseIntPipe, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { EcolesService } from '../ecoles/ecoles.service';
import { CreateEcoleDto } from '../ecoles/dto/create-ecole.dto';
import { UpdateEcoleDto } from '../ecoles/dto/update-ecole.dto';

@Controller('api/admin/ecoles')
export class AdminController {
  constructor(private readonly ecolesService: EcolesService) {}

  @Get()
  @Roles('superadmin') // Seul un superadmin peut accéder
  findAllEcoles() {
    return this.ecolesService.findAll();
  }

  @Post()
  @Roles('superadmin')
  createEcole(@Body(new ValidationPipe()) createEcoleDto: CreateEcoleDto) {
    return this.ecolesService.create(createEcoleDto);
  }

  @Put(':id')
  @Roles('superadmin')
  updateEcole(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe()) updateEcoleDto: UpdateEcoleDto,
  ) {
    return this.ecolesService.update(id, updateEcoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('superadmin')
  async removeEcole(@Param('id', ParseIntPipe) id: number) {
    await this.ecolesService.remove(id);
  }
}
