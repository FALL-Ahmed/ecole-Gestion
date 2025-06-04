import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Matiere } from './matiere.entity';

@Injectable()
export class MatiereService {
  constructor(
    @InjectRepository(Matiere)
    private readonly matiereRepository: Repository<Matiere>,
  ) {}

  findAll(): Promise<Matiere[]> {
    return this.matiereRepository.find();
  }

  findOne(id: number): Promise<Matiere | null> {
    return this.matiereRepository.findOneBy({ id });
  }

  async create(data: Partial<Matiere>): Promise<Matiere> {
    const matiere = this.matiereRepository.create(data);
    return this.matiereRepository.save(matiere);
  }

  async update(id: number, data: Partial<Matiere>): Promise<Matiere> {
    await this.matiereRepository.update(id, data);
    return this.findOne(id) as Promise<Matiere>;
  }

  async remove(id: number): Promise<void> {
    await this.matiereRepository.delete(id);
  }
}