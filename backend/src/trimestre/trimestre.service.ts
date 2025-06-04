import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trimestre } from './trimestre.entity';
import { CreateTrimestreDto } from './create-trimestre.dto';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
export class TrimestreService {
  constructor(
    @InjectRepository(Trimestre)
    private readonly trimestreRepo: Repository<Trimestre>,
    @InjectRepository(anneescolaire)
    private readonly anneeRepo: Repository<anneescolaire>,
  ) {}

  async create(data: CreateTrimestreDto): Promise<Trimestre> {
    const annee = await this.anneeRepo.findOne({ where: { id: data.annee_scolaire_id } });
    if (!annee) throw new NotFoundException('Année scolaire non trouvée');

    const trimestre = this.trimestreRepo.create({
      nom: data.nom,
      date_debut: data.date_debut,
      date_fin: data.date_fin,
      anneeScolaire: annee,
    });

    return this.trimestreRepo.save(trimestre);
  }
  

  findAll(): Promise<Trimestre[]> {
    return this.trimestreRepo.find({ relations: ['anneeScolaire'] });
  }
}
