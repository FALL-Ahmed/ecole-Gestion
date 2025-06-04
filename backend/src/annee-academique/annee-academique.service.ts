import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { anneescolaire } from './annee-academique.entity';
import { CreateAnneeAcademiqueDto } from './create-annee-academique.dto';

@Injectable()
export class AnneeAcademiqueService {
  constructor(
    @InjectRepository(anneescolaire)
    private readonly anneeRepo: Repository<anneescolaire>,
  ) {}

  findAll(): Promise<anneescolaire[]> {
    return this.anneeRepo.find();
  }

  async findById(id: number): Promise<anneescolaire> {
    const annee = await this.anneeRepo.findOne({ where: { id } });
    if (!annee) throw new NotFoundException('Année académique non trouvée');
    return annee;
  }

  create(data: CreateAnneeAcademiqueDto): Promise<anneescolaire> {
    const annee = this.anneeRepo.create(data);
    return this.anneeRepo.save(annee);
  }
}
