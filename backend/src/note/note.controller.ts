import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe, UsePipes, ValidationPipe, Query, HttpCode, HttpStatus, BadRequestException, UseGuards } from '@nestjs/common';
import { NoteService } from './note.service';
import { Note } from './note.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('api/notes')
@UseGuards(JwtAuthGuard, RolesGuard) // SÉCURITÉ AJOUTÉE
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR) // Seuls admin et prof peuvent créer
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createMultiple(@Body() createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    return this.noteService.createMultiple(createNoteDtos);
  }

  @Get()
  async findFilteredNotes(
    @Query('evaluationIds') evaluationIdsString?: string,
    @Query('evaluation_id') evaluationIdSingle?: string,
    @Query('etudiant_id') etudiantId?: string,
  ): Promise<Note[] | Note | null> {
    let parsedEvaluationIds: number[] | undefined;
    if (evaluationIdsString) {
      parsedEvaluationIds = evaluationIdsString.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      if (parsedEvaluationIds.length === 0) {
        parsedEvaluationIds = undefined;
      }
    } else if (evaluationIdSingle) {
      const singleId = parseInt(evaluationIdSingle, 10);
      if (!isNaN(singleId)) {
        parsedEvaluationIds = [singleId];
      }
    }

    const parsedEtudiantId = etudiantId ? parseInt(etudiantId, 10) : undefined;

    if (parsedEvaluationIds && parsedEvaluationIds.length > 0 && parsedEtudiantId) {
      return this.noteService.findNotesByEvaluationIdsAndStudentId(parsedEvaluationIds, parsedEtudiantId);
    } else if (parsedEvaluationIds && parsedEvaluationIds.length > 0) {
      return this.noteService.findByEvaluationIds(parsedEvaluationIds);
    } else if (parsedEtudiantId) {
      throw new BadRequestException("Veuillez fournir des 'evaluationIds' ou un 'evaluation_id' pour filtrer les notes.");
    }
    return this.noteService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Note> {
    return this.noteService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR) // Seuls admin et prof peuvent modifier
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateNoteDto: Partial<Note>
  ): Promise<Note> {
    return this.noteService.update(id, updateNoteDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR) // Seuls admin et prof peuvent supprimer
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.noteService.remove(id);
  }
}