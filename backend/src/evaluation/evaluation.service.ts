import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findAll() {
    return this.evaluationRepository.find({
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
