// src/evaluation/evaluation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm'; // Importez FindOptionsWhere

import { Evaluation } from './evaluation.entity';

@Injectable()
export class EvaluationService {
  constructor(
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {}

  async create(data: Partial<Evaluation>) {
    const newEval = this.evaluationRepository.create(data);
    return this.evaluationRepository.save(newEval);
  }

  // Modified findAll to accept filter options
  async findAll(
    classeId?: number,
    matiereId?: number,
    trimestreName?: string, // Renommé pour plus de clarté, c'est le nom comme "Trimestre 1"

    anneeScolaireId?: number,
  ): Promise<Evaluation[]> {
      const where: FindOptionsWhere<Evaluation> = {}; // Utilisez un typage plus spécifique

    if (classeId !== undefined) { // Vérifiez undefined pour permettre 0 comme ID valide

      where.classe = { id: classeId }; // Assuming 'classe' is a relation with an 'id' field
    }
    if (matiereId) {
      where.matiere = { id: matiereId }; // Assuming 'matiere' is a relation with an 'id' field
    }
    if (trimestreName) {
      
      where.trimestre = { nom: trimestreName };
    }
    if (anneeScolaireId !== undefined) {
      where.anneeScolaire = { id: anneeScolaireId }; // Assuming 'anneeScolaire' is a relation with an 'id' field
    }

    return this.evaluationRepository.find({
      where, // Apply the filtering conditions
      relations: ['classe', 'matiere', 'professeur', 'trimestre', 'anneeScolaire'],
    });
  }

  async findOne(id: number) {
    return this.evaluationRepository.findOne({
      where: { id },
      relations: ['classe', 'matiere', 'professeur', 'trimestre', 'anneeScolaire'],
    });
  }

  async remove(id: number) {
    return this.evaluationRepository.delete(id);
  }
}