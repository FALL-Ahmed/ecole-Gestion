import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';

import { Evaluation } from './evaluation.entity';
// L'import de Trimestre n'est pas nécessaire ici à moins que vous ne l'utilisiez directement
// Pour la définition du 'where', { id: trimestreId } ne nécessite pas l'import de l'entité Trimestre elle-même ici.

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

  async findAll(
    classeId?: number,
    matiereId?: number,
    trimestreId?: number, // C'est l'ID numérique du trimestre reçu du frontend
    anneeScolaireId?: number,
  ): Promise<Evaluation[]> {
    console.log('EvaluationService.findAll received:', { classeId, matiereId, trimestreId, anneeScolaireId }); // Ajout de log pour le débogage
    const where: FindOptionsWhere<Evaluation> = {};

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

    console.log('EvaluationService.findAll WHERE clause before find:', where); // Ajout de log pour le débogage

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
    return this.evaluationRepository.findOne({
      where: { id },
      relations: ['classe', 'matiere', 'professeur', 'trimestre', 'anneeScolaire'],
    });
  }

  async remove(id: number) {
    if (isNaN(id)) {
      throw new BadRequestException("L'ID de l'évaluation à supprimer doit être un nombre valide.");
    }
    const result = await this.evaluationRepository.delete(id);
    if (result.affected === 0) {
      throw new BadRequestException(`Évaluation avec l'ID ${id} non trouvée.`);
    }
    return result;
  }
}