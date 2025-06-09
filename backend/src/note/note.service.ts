// src/note/note.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity';
import { User } from '../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto'; // <-- Assurez-vous que le chemin est correct


@Injectable()
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,

    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createMultiple(createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    if (!Array.isArray(createNoteDtos) || createNoteDtos.length === 0) {
      throw new BadRequestException('Le corps de la requête doit être un tableau de notes et ne doit pas être vide.');
    }

    const notesToSave: Note[] = [];

    for (const dto of createNoteDtos) {
      const evaluationExists = await this.evaluationRepository.findOneBy({ id: dto.evaluation_id });
      if (!evaluationExists) {
        throw new NotFoundException(`Évaluation avec l'ID ${dto.evaluation_id} non trouvée.`);
      }

      const etudiantExists = await this.userRepository.findOneBy({ id: dto.etudiant_id });
      if (!etudiantExists) {
        throw new NotFoundException(`Étudiant avec l'ID ${dto.etudiant_id} non trouvé.`);
      }

      // Important: Pour les relations, utilisez les objets complets si vous les avez,
      // sinon, liez par l'ID comme vous le faites.
      // TypeORM créera automatiquement la liaison via les @JoinColumn.
      const notePartial: DeepPartial<Note> = {
        note: dto.note,
        evaluation: { id: dto.evaluation_id } as Evaluation, // Lier par ID
        etudiant: { id: dto.etudiant_id } as User,          // Lier par ID
      };
      notesToSave.push(this.noteRepository.create(notePartial));
    }

    try {
      return await this.noteRepository.save(notesToSave);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de plusieurs notes:", error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2') {
          throw new BadRequestException('Erreur de référence: un des IDs (évaluation ou étudiant) fournis n\'existe pas.');
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création des notes.');
    }
  }

  async findAll(): Promise<Note[]> {
    return this.noteRepository.find({
      relations: {
        evaluation: { // Charge l'objet évaluation
          matiere: true, // Charge l'objet matière à l'intérieur de l'évaluation
          
        },
        etudiant: true, // Charge l'objet étudiant
      },
    });
  }

  async findByEvaluation(evaluationId: number): Promise<Note[]> {
    if (isNaN(evaluationId)) {
        throw new BadRequestException('L\'ID de l\'évaluation doit être un nombre.');
    }
    return this.noteRepository.find({
      where: { evaluation: { id: evaluationId } },
      relations: {
        evaluation: { // Charge l'objet évaluation et ses relations imbriquées
          matiere: true,
         
        },
        etudiant: true, // Charge la relation étudiant
      },
    });
  }

  async findOne(id: number): Promise<Note> {
    if (isNaN(id)) {
        throw new BadRequestException('L\'ID de la note doit être un nombre.');
    }
    const note = await this.noteRepository.findOne({
        where: { id },
        relations: {
          evaluation: { // Charge l'objet évaluation et ses relations imbriquées
            matiere: true,
            
          },
          etudiant: true,
        },
    });
    if (!note) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
    return note;
  }

  

  async remove(id: number): Promise<void> {
    if (isNaN(id)) {
        throw new BadRequestException('L\'ID de la note doit être un nombre.');
    }
    const result = await this.noteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
  }
}