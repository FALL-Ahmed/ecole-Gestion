import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Scope, Inject, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository, DeepPartial } from 'typeorm';
import { Note } from './note.entity';
import { Evaluation } from '../evaluation/evaluation.entity';
import { User } from '../users/user.entity';
import { CreateNoteDto } from './dto/create-note.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class NoteService {
  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,

    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>, // Gardé pour la validation, même si non utilisé pour l'expansion directe ici

    @InjectRepository(User)
    private userRepository: Repository<User>, // Gardé pour la validation

    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number {
    const user = this.request.user as any;
    if (!user || !user.blocId) {
      throw new UnauthorizedException("Impossible d'effectuer des opérations sur les notes sans être dans le contexte d'un bloc.");
    }
    return user.blocId;
  }

  async createMultiple(createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    if (!Array.isArray(createNoteDtos) || createNoteDtos.length === 0) {
      throw new BadRequestException('Le corps de la requête doit être un tableau de notes et ne doit pas être vide.');
    }

    const blocId = this.getBlocId();
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

      // Note: TypeORM gère la création de la relation via les IDs.
      // L'objet evaluation et etudiant n'ont besoin que de leur 'id' pour la création.
      const notePartial: DeepPartial<Note> = {
        note: dto.note,
        evaluation: { id: dto.evaluation_id } as Evaluation, // Assigne l'ID de l'évaluation
        etudiant: { id: dto.etudiant_id } as User,       // Assigne l'ID de l'étudiant
        blocId: blocId, // Assigne le blocId du tenant actuel
      };
      notesToSave.push(this.noteRepository.create(notePartial));
    }

    try {
      // La méthode save s'occupera d'insérer les notes avec les relations.
      // Les entités retournées par save peuvent ne pas avoir toutes les relations étendues par défaut.
      // Si vous avez besoin des relations étendues immédiatement après la création,
      // vous devrez les récupérer à nouveau avec les options de relations appropriées.
      return await this.noteRepository.save(notesToSave);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de plusieurs notes:", error);
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') { // Codes d'erreur pour MySQL et PostgreSQL
          throw new BadRequestException('Erreur de référence: un des IDs (évaluation ou étudiant) fournis n\'existe pas.');
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création des notes.');
    }
  }
async findAll(): Promise<Note[]> {
  const notes = await this.noteRepository.find({
    where: { blocId: this.getBlocId() },
    relations: {
  evaluation: {
    matiere: true,
    classe: true,
    trimestre: true,
    anneeScolaire: true,
    professeur: true,
  },
  etudiant: true,
},

  });
  console.log("[Backend Debug] Note avec évaluation ID 22 :", notes.find(n => n.evaluation?.id === 22));
  return notes;
}

  async findByEvaluation(evaluationId: number): Promise<Note[]> {
    if (isNaN(evaluationId)) {
      throw new BadRequestException('L\'ID de l\'évaluation doit être un nombre valide.');
    }
    return this.noteRepository.find({
      where: { evaluation: { id: evaluationId }, blocId: this.getBlocId() },
      relations: {
  evaluation: {
    matiere: true,
    classe: true,
    trimestre: true,
    anneeScolaire: true,
    professeur: true,
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
      where: { evaluation: { id: In(evaluationIds) }, blocId: this.getBlocId() },
       relations: {
  evaluation: {
    matiere: true,
    classe: true,
    trimestre: true,
    anneeScolaire: true,
    professeur: true,
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
      where: { id, blocId: this.getBlocId() },
      relations: {
  evaluation: {
    matiere: true,
    classe: true,
    trimestre: true,
    anneeScolaire: true,
    professeur: true,
  },
  etudiant: true,
},

    });
    if (!note) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée.`);
    }
    return note;
  }

  async findNotesByEvaluationIdsAndStudentId(evaluationIds: number[], etudiantId: number): Promise<Note[] | null> {
    if (!evaluationIds || evaluationIds.length === 0 || isNaN(etudiantId)) {
      throw new BadRequestException('Les IDs d\'évaluation doivent être un tableau non vide et l\'ID de l\'étudiant doit être un nombre valide.');
    }

    const notes = await this.noteRepository.find({
      where: {
        evaluation: { id: In(evaluationIds) },
        etudiant: { id: etudiantId },
        blocId: this.getBlocId(),
      },
     relations: {
  evaluation: {
    matiere: true,
    classe: true,
    trimestre: true,
    anneeScolaire: true,
    professeur: true,
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
  
    const blocId = this.getBlocId();
    // Vérifier si la note existe
    const noteToUpdate = await this.noteRepository.findOneBy({ id, blocId });
    if (!noteToUpdate) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée dans ce bloc pour la mise à jour.`);
    }
  
    // Si evaluation ou etudiant sont fournis dans data, il faut les traiter comme des relations
    const updatePayload: DeepPartial<Note> = { ...data };
  
    if (data.evaluation && typeof (data.evaluation as any).id === 'number') {
      const evaluationExists = await this.evaluationRepository.findOneBy({ id: (data.evaluation as any).id });
      if (!evaluationExists) {
        throw new NotFoundException(`Évaluation avec l'ID ${(data.evaluation as any).id} non trouvée.`);
      }
      updatePayload.evaluation = { id: (data.evaluation as any).id } as Evaluation;
    } else if (data.evaluation) { // Si evaluation est un objet sans id, ou autre chose, c'est potentiellement une erreur
        delete updatePayload.evaluation; // Ne pas essayer de mettre à jour la relation de manière incorrecte
    }
  
    if (data.etudiant && typeof (data.etudiant as any).id === 'number') {
      const etudiantExists = await this.userRepository.findOneBy({ id: (data.etudiant as any).id });
      if (!etudiantExists) {
        throw new NotFoundException(`Étudiant avec l'ID ${(data.etudiant as any).id} non trouvé.`);
      }
      updatePayload.etudiant = { id: (data.etudiant as any).id } as User;
    } else if (data.etudiant) {
        delete updatePayload.etudiant;
    }
  
    // Appliquer les modifications à l'entité chargée
    // TypeORM gère la mise à jour des champs simples et des relations si les IDs sont fournis
    await this.noteRepository.update({ id, blocId }, updatePayload);
  
    // Récupérer la note mise à jour avec toutes les relations souhaitées
    const updatedNoteWithRelations = await this.findOne(id);
    if (!updatedNoteWithRelations) {
        // Cela ne devrait pas arriver si la mise à jour a réussi et que findOne est correct
        throw new InternalServerErrorException('Impossible de récupérer la note après la mise à jour.');
    }
    return updatedNoteWithRelations;
  }
  

  async remove(id: number): Promise<void> {
    if (isNaN(id)) {
      throw new BadRequestException('L\'ID de la note à supprimer doit être un nombre valide.');
    }
    const result = await this.noteRepository.delete({ id, blocId: this.getBlocId() });
    if (result.affected === 0) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée dans ce bloc.`);
    }
  }
}
