import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Scope, Inject, UnauthorizedException, Logger, ForbiddenException } from '@nestjs/common';
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
  private readonly logger = new Logger(NoteService.name);

  constructor(
    @InjectRepository(Note)
    private noteRepository: Repository<Note>,

    @InjectRepository(Evaluation)
    private evaluationRepository: Repository<Evaluation>, // Gardé pour la validation, même si non utilisé pour l'expansion directe ici

    @InjectRepository(User)
    private userRepository: Repository<User>, // Gardé pour la validation

    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;
   // Priorité 1: Le blocId dans le token (pour admin, prof, élève)
    if (user && user.blocId) {
      this.logger.debug(`[getBlocId] blocId ${user.blocId} trouvé dans le token JWT.`);
      return user.blocId;

    }
    // Priorité 2: Le blocId dans les paramètres de la requête (pour les parents)
    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      const blocId = parseInt(queryBlocId as string, 10);
      this.logger.debug(`[getBlocId] blocId ${blocId} trouvé dans les paramètres de la requête.`);
      return blocId;
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  private async verifyParentAccess(eleveId: number): Promise<void> {
    const user = this.request.user as any;

    // This check is only relevant for parents. Admins/profs are scoped by blocId.
    if (user.role !== 'parent') {
      return;
    }

    const parentId = user.id;
    const student = await this.userRepository.findOne({
      where: { id: eleveId },
    });

    if (!student || student.parentId !== parentId) {
      throw new ForbiddenException("Accès non autorisé aux données de cet élève.");
    }
  }

  async createMultiple(createNoteDtos: CreateNoteDto[]): Promise<Note[]> {
    if (!Array.isArray(createNoteDtos) || createNoteDtos.length === 0) {
      throw new BadRequestException('Le corps de la requête doit être un tableau de notes et ne doit pas être vide.');
    }

    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Impossible de créer des notes sans être dans le contexte d'un bloc.");
    }

    // --- OPTIMIZATION: Validate all entities in bulk ---
    const evaluationIds = [...new Set(createNoteDtos.map(dto => dto.evaluation_id))];
    const etudiantIds = [...new Set(createNoteDtos.map(dto => dto.etudiant_id))];

    const [evaluations, etudiants] = await Promise.all([
      this.evaluationRepository.find({ where: { id: In(evaluationIds), blocId } }),
      this.userRepository.find({ where: { id: In(etudiantIds) } })
    ]);

    const evaluationsMap = new Map(evaluations.map(e => [e.id, e]));
    const etudiantsMap = new Map(etudiants.map(e => [e.id, e]));
    // --- END OPTIMIZATION ---

    const notesToSave: Note[] = [];

    for (const dto of createNoteDtos) {
      if (!evaluationsMap.has(dto.evaluation_id)) {
        throw new NotFoundException(`Évaluation avec l'ID ${dto.evaluation_id} non trouvée dans ce bloc.`);
      }

      if (!etudiantsMap.has(dto.etudiant_id)) {
        throw new NotFoundException(`Étudiant avec l'ID ${dto.etudiant_id} non trouvé.`);
      }

      const notePartial: DeepPartial<Note> = {
        note: dto.note,
        evaluation: { id: dto.evaluation_id },
        etudiant: { id: dto.etudiant_id },
        blocId: blocId,
      };
      notesToSave.push(this.noteRepository.create(notePartial));
    }

    try {
      this.logger.log(`Création de ${notesToSave.length} notes pour le blocId: ${blocId}.`);
      return await this.noteRepository.save(notesToSave);
    } catch (error) {
      this.logger.error(`Erreur lors de la sauvegarde de plusieurs notes pour le blocId ${blocId}:`, error.stack);
      if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === '23503') {
          throw new BadRequestException('Erreur de référence: un des IDs (évaluation ou étudiant) fournis n\'existe pas.');
      }
      throw new InternalServerErrorException('Erreur serveur lors de la création des notes.');
    }
  }
async findAll(): Promise<Note[]> {
  const blocId = this.getBlocId();
  if (blocId === null) {
    this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
    return [];
  }
  const notes = await this.noteRepository.find({
    where: { blocId: blocId },
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
  return notes;
}

  async findByEvaluation(evaluationId: number): Promise<Note[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      return [];
    }
    if (isNaN(evaluationId)) {
      throw new BadRequestException('L\'ID de l\'évaluation doit être un nombre valide.');
    }
    return this.noteRepository.find({
      where: { evaluation: { id: evaluationId }, blocId: blocId },
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
    const blocId = this.getBlocId();
    if (blocId === null) {
      return [];
    }
    if (!evaluationIds || evaluationIds.length === 0) {
      return [];
    }
    return this.noteRepository.find({
      where: { evaluation: { id: In(evaluationIds) }, blocId: blocId },
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
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }
    if (isNaN(id)) {
      throw new BadRequestException('L\'ID de la note doit être un nombre valide.');
    }
    const note = await this.noteRepository.findOne({
      where: { id, blocId: blocId },
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
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée dans ce bloc.`);
    }
    return note;
  }

  async findNotesByEvaluationIdsAndStudentId(evaluationIds: number[], etudiantId: number): Promise<Note[] | null> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      return null;
    }
    if (!evaluationIds || evaluationIds.length === 0 || isNaN(etudiantId)) {
      throw new BadRequestException('Les IDs d\'évaluation doivent être un tableau non vide et l\'ID de l\'étudiant doit être un nombre valide.');
    }

    // Security check: Ensure the parent is requesting their own child's notes.
    await this.verifyParentAccess(etudiantId);

    const notes = await this.noteRepository.find({
      where: {
        evaluation: { id: In(evaluationIds) },
        etudiant: { id: etudiantId },
        blocId: blocId,
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
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }

    // 1. Load the entity. `findOne` already performs security checks.
    const note = await this.findOne(id);

    // 2. Update simple properties
    if (data.note !== undefined) {
      note.note = data.note;
    }

    // 3. Update relations if provided
    if (data.evaluation && data.evaluation.id) {
      const evaluation = await this.evaluationRepository.findOneBy({ id: data.evaluation.id, blocId });
      if (!evaluation) {
        throw new NotFoundException(`Évaluation avec l'ID ${data.evaluation.id} non trouvée dans ce bloc.`);
      }
      note.evaluation = evaluation;
    }

    if (data.etudiant && data.etudiant.id) {
      const etudiant = await this.userRepository.findOneBy({ id: data.etudiant.id });
      if (!etudiant) {
        throw new NotFoundException(`Étudiant avec l'ID ${data.etudiant.id} non trouvé.`);
      }
      note.etudiant = etudiant;
    }

    // 4. Save the updated entity
    this.logger.log(`Mise à jour de la note ID ${id} pour le blocId: ${blocId}.`);
    return this.noteRepository.save(note);
  }
  

  async remove(id: number): Promise<void> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    const result = await this.noteRepository.delete({ id, blocId: blocId });
    if (result.affected === 0) {
      throw new NotFoundException(`Note avec l'ID ${id} non trouvée dans ce bloc.`);
    }
  }
}
