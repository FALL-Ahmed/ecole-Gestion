import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classe } from './classe.entity';

@Injectable()
export class ClasseService {
  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
  ) {}

  async findAll(): Promise<Classe[]> {
    return this.classeRepository.find();
  }

  async findById(id: number): Promise<Classe> {
    const classe = await this.classeRepository.findOne({ where: { id } });
    if (!classe) {
      throw new NotFoundException('Classe non trouvée');
    }
    return classe;
  }

  async createClasse(data: { nom: string; description?: string }): Promise<Classe> {
    const newClasse = this.classeRepository.create(data);
    return this.classeRepository.save(newClasse);
  }

  async updateClasse(id: number, data: Partial<Classe>): Promise<Classe> {
    const classe = await this.findById(id);
    Object.assign(classe, data);
    return this.classeRepository.save(classe);
  }

  async deleteClasse(id: number): Promise<void> {
    const result = await this.classeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Classe non trouvée pour suppression');
    }
  }
}
