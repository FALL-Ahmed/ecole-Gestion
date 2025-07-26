import { Injectable, BadRequestException, Scope, Inject, UnauthorizedException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

import { Evaluation } from './evaluation.entity';
// L'import de Trimestre n'est pas nécessaire ici à moins que vous ne l'utilisiez directement
// Pour la définition du 'where', { id: trimestreId } ne nécessite pas l'import de l'entité Trimestre elle-même ici.

@Injectable({ scope: Scope.REQUEST })
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  private getBlocId(): number | null {
    const user = this.request.user as any;

    if (user && user.blocId) {
      return user.blocId;
    }

    const queryBlocId = this.request.query.blocId;
    if (queryBlocId && !isNaN(parseInt(queryBlocId as string, 10))) {
      return parseInt(queryBlocId as string, 10);
    }

    this.logger.warn(`[getBlocId] Aucun blocId trouvé pour l'utilisateur ${user?.email}.`);
    return null;
  }

  async create(data: Partial<Evaluation>) {
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Impossible de créer une évaluation sans être dans le contexte d'un bloc.");
    }
    const newEval = this.evaluationRepository.create({ ...data, blocId });
    return this.evaluationRepository.save(newEval);
  }

  async findAll(
    classeId?: number,
    matiereId?: number,
    trimestreId?: number, // C'est l'ID numérique du trimestre reçu du frontend
    anneeScolaireId?: number,
  ): Promise<Evaluation[]> {
    const blocId = this.getBlocId();
    if (blocId === null) {
      this.logger.warn("[findAll] Aucun blocId fourni, retour d'une liste vide.");
      return [];
    }

    const where: FindOptionsWhere<Evaluation> = { blocId };

    if (classeId !== undefined && !isNaN(classeId)) {
      where.classe = { id: classeId };
    }
    if (matiereId !== undefined && !isNaN(matiereId)) {
      where.matiere = { id: matiereId };
    }

    // --- CORRECTION CLÉ ICI : FILTRAGE SUR L'ID DE LA RELATION TRIMESTRE ---
    if (trimestreId !== undefined && !isNaN(trimestreId)) {
      where.trimestre = { id: trimestreId }; // Utilisez l'ID pour filtrer sur la relation
    }
    // ---------------------------------------------------------------------

    if (anneeScolaireId !== undefined && !isNaN(anneeScolaireId)) {
      where.anneeScolaire = { id: anneeScolaireId };
    }

    return this.evaluationRepository.find({
      where,
      // Inclure 'trimestre' dans les relations pour que le LEFT JOIN soit généré correctement
      relations: ['classe', 'matiere', 'professeur', 'trimestre', 'anneeScolaire'],
    });
  }

  async findOne(id: number) {
    if (isNaN(id)) {
      throw new BadRequestException("L'ID de l'évaluation doit être un nombre valide.");
    }
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new NotFoundException(`Évaluation avec l'ID ${id} non trouvée car aucun bloc n'est sélectionné.`);
    }
    const evaluation = await this.evaluationRepository.findOne({
      where: { id, blocId },
      relations: ['classe', 'matiere', 'professeur', 'trimestre', 'anneeScolaire'],
    });
    if (!evaluation) {
      throw new NotFoundException(`Évaluation avec l'ID ${id} non trouvée dans ce bloc.`);
    }
    return evaluation;
  }

  async remove(id: number) {
    if (isNaN(id)) {
      throw new BadRequestException("L'ID de l'évaluation à supprimer doit être un nombre valide.");
    }
    const blocId = this.getBlocId();
    if (blocId === null) {
      throw new UnauthorizedException("Action non autorisée en dehors du contexte d'un bloc.");
    }
    const result = await this.evaluationRepository.delete({ id, blocId });
    if (result.affected === 0) {
      throw new NotFoundException(`Évaluation avec l'ID ${id} non trouvée dans ce bloc.`);
    }
    return result;
  }
}