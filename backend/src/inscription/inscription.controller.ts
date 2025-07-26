import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
// Removed Req, ForbiddenException
import { InscriptionService } from './inscription.service';
import { CreateInscriptionDto } from './dto/create-inscription.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';
// Removed helper interfaces and functions

@Controller('api/inscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InscriptionController {
  constructor(private readonly inscriptionService: InscriptionService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createDto: CreateInscriptionDto) {
    // The service now handles the blocId internally.
    return this.inscriptionService.create(createDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: Partial<CreateInscriptionDto>,
  ) {
    // The service now handles the blocId internally.
    return this.inscriptionService.update(id, updateDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent',UserRole.ETUDIANT)
  findAll(
    @Query('utilisateurId', new ParseIntPipe({ optional: true })) utilisateurId?: number,
    @Query('classeId', new ParseIntPipe({ optional: true })) classeId?: number,
    @Query('anneeScolaireId', new ParseIntPipe({ optional: true })) anneeScolaireId?: number,
    // The blocId from query is now handled by the service for parents
  ) {
    const filters = { utilisateurId, classeId, anneeScolaireId };
    return this.inscriptionService.findAll(filters);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, 'parent')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    // The service now handles the blocId and parent access check internally.
    return this.inscriptionService.findOne(id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    // The service now handles the blocId internally.
    return this.inscriptionService.remove(id);
  }
}