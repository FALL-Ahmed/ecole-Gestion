// src/note/note.controller.ts
import { Controller, Post, Body, Get, Param, Put, Delete, ParseIntPipe, UsePipes, ValidationPipe } from '@nestjs/common';
import { NoteService } from './note.service';
import { Note } from './note.entity';
import { CreateNoteDto } from './dto/create-note.dto';


@Controller('api/notes')
export class NoteController {
  constructor(private readonly noteService: NoteService) {}

  @Post()
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

  

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.noteService.remove(id);
  }
}