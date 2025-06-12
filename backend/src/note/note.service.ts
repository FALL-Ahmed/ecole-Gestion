import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DeepPartial } from 'typeorm';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity';
import { User } from '../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto';

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

      const notePartial: DeepPartial<Note> = {
        note: dto.note,
        evaluation: { id: dto.evaluation_id } as Evaluation,
        etudiant: { id: dto.etudiant_id } as User,
      };
      notesToSave.push(this.noteRepository.create(notePartial));
    }

    try {
      return await this.noteRepository.save(notesToSave);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de plusieurs notes:", error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
          throw new BadRequestException('Erreur de référence: un des IDs (évaluation ou étudiant) fournis n\'existe pas.');
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création des notes.');
    }
  }

  async findAll(): Promise<Note[]> {
    return this.noteRepository.find({
      relations: {
        evaluation: {
          matiere: true,
        },
        etudiant: true,
      },
    });
  }

  async findByEvaluation(evaluationId: number): Promise<Note[]> {
    if (isNaN(evaluationId)) {
      throw new BadRequestException('L\'ID de l\'évaluation doit être un nombre valide.');
    }
    return this.noteRepository.find({
      where: { evaluation: { id: evaluationId } },
      relations: {
        evaluation: {
          matiere: true,
        },
        etudiant: true,
      },
    });
  }

  async findByEvaluationIds(evaluationIds: number[]): Promise<Note[]> {
    if (!evaluationIds || evaluationIds.length === 0) {
      return [];
    }
    return this.noteRepository.find({
      where: { evaluation: { id: In(evaluationIds) } },
      relations: {
        evaluation: {
          matiere: true,
        },
        etudiant: true,
      },
    });
  }

  async findOne(id: number): Promise<Note> {
    if (isNaN(id)) {
      throw new BadRequestException('L\'ID de la note doit être un nombre valide.');
    }
    const note = await this.noteRepository.findOne({
      where: { id },
      relations: {
        evaluation: {
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

  // Anciennement findOneByEvaluationAndStudent, maintenant adapté pour accepter un tableau d'IDs
  async findNotesByEvaluationIdsAndStudentId(evaluationIds: number[], etudiantId: number): Promise<Note[] | null> {
    if (!evaluationIds || evaluationIds.length === 0 || isNaN(etudiantId)) {
      throw new BadRequestException('Les IDs d\'évaluation doivent être un tableau non vide et l\'ID de l\'étudiant doit être un nombre valide.');
    }

    const notes = await this.noteRepository.find({
      where: {
        evaluation: { id: In(evaluationIds) },
        etudiant: { id: etudiantId },
      },
      relations: {
        evaluation: {
          matiere: true,
        },
        etudiant: true,
      },
    });
    return notes.length > 0 ? notes : null;
  }

  async update(id: number, data: Partial<Note>): Promise<Note> {
    if (isNaN(id)) {
      throw new BadRequestException('L\'ID de la note à mettre à jour doit être un nombre valide.');
    }

    const noteToUpdate = await this.noteRepository.findOneBy({ id });
    if (!noteToUpdate) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée pour la mise à jour.`);
    }

    const updatedNote = this.noteRepository.create({ ...noteToUpdate, ...data, id });

    try {
      return await this.noteRepository.save(updatedNote);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour de la note ${id}:`, error);
      throw new InternalServerErrorException('Erreur serveur lors de la mise à jour de la note.');
    }
  }

  async remove(id: number): Promise<void> {
    if (isNaN(id)) {
      throw new BadRequestException('L\'ID de la note à supprimer doit être un nombre valide.');
    }
    const result = await this.noteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
  }
}