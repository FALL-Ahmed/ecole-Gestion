// src/note/note.controller.ts
import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common'; // Removed BadRequestException as it's handled by ValidationPipe or service
import { NoteService } from './note.service';
import { Note } from './note.entity'; // Assurez-vous que le chemin est correct
import { CreateNoteDto } from './dto/create-note.dto';

@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
  // Supprimez 'expectedType' pour permettre au ValidationPipe de gérer correctement les tableaux de DTOs.
  // ValidationPipe validera chaque élément du tableau createNoteDtos par rapport à CreateNoteDto.
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async createMultiple(@Body() createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    return this.noteService.createMultiple(createNoteDtos);
  }

  @Get()
  async findAll(): Promise<Note[]> {
    return this.noteService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Note> {
    return this.noteService.findOne(id);
  }

  @Get('evaluation/:evaluationId')
  async findByEvaluation(@Param('evaluationId', ParseIntPipe) evaluationId: number): Promise<Note[]> {
    return this.noteService.findByEvaluation(evaluationId);
  }

  @Put(':id')
  // Vous pourriez vouloir un UpdateNoteDto ici, similaire à CreateNoteDto mais avec tous les champs optionnels.
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateData: Partial<Note>): Promise<Note> {
    return this.noteService.update(id, updateData);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.noteService.remove(id);
  }
}
