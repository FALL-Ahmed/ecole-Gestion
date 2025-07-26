import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe, UsePipes, ValidationPipe, Query, HttpCode, HttpStatus, BadRequestException, UseGuards, ParseArrayPipe } from '@nestjs/common';
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
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, UserRole.ETUDIANT, 'parent')
  async findFilteredNotes(
    @Query('evaluation_id', new ParseIntPipe({ optional: true })) evaluationId?: number,
    @Query('evaluationIds', new ParseArrayPipe({ items: Number, separator: ',', optional: true })) evaluationIds?: number[],
    @Query('etudiant_id', new ParseIntPipe({ optional: true })) etudiantId?: number,
  ): Promise<Note[] | Note | null> {
    // Combine evaluationId and evaluationIds into a single array for consistency.
    // `evaluationIds` from query takes precedence.
    const finalEvaluationIds = evaluationIds || (evaluationId ? [evaluationId] : undefined);

    // Case 1: Filter by student and evaluations
    if (finalEvaluationIds && etudiantId) {
      return this.noteService.findNotesByEvaluationIdsAndStudentId(finalEvaluationIds, etudiantId);
    }

    // Case 2: Filter by evaluations only
    if (finalEvaluationIds) {
      return this.noteService.findByEvaluationIds(finalEvaluationIds);
    }
    
    // Case 3: Filtering by student only is ambiguous without an evaluation context.
    if (etudiantId) {
      throw new BadRequestException("Veuillez fournir des 'evaluationIds' ou un 'evaluation_id' pour filtrer les notes par étudiant.");
    }
    
    // Default case: return all notes for the user's bloc
    return this.noteService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PROFESSEUR, UserRole.ETUDIANT, 'parent')
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