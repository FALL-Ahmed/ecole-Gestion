import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Classe } from './classe.entity';
import { Niveau } from './classe.entity';
import { anneescolaire } from '../annee-academique/annee-academique.entity';

@Injectable()
export class ClasseService {
  constructor(
    @InjectRepository(Classe)
    private readonly classeRepository: Repository<Classe>,
    @InjectRepository(anneescolaire)
    private readonly anneeScolaireRepository: Repository<anneescolaire>,
  ) {}

  async findAll(): Promise<Classe[]> {
    return this.classeRepository.find({ 
      relations: ['anneeScolaire'],
      order: { nom: 'ASC' } 
    });
  }

  async findById(id: number): Promise<Classe> {
    const classe = await this.classeRepository.findOne({ 
      where: { id },
      relations: ['anneeScolaire', 'inscriptions']
    });
    
    if (!classe) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée`);
    }
    return classe;
  }

  async createClasse(data: { 
    nom: string; 
    niveau: Niveau;
    description?: string;
    anneeScolaireId: number;
    frais_scolarite: number;
  }): Promise<Classe> {
    // Vérifier si l'année scolaire existe
    const anneeScolaire = await this.anneeScolaireRepository.findOneBy({ id: data.anneeScolaireId });
    if (!anneeScolaire) {
      throw new NotFoundException(`Année scolaire avec l'ID ${data.anneeScolaireId} non trouvée`);
    }

    const newClasse = this.classeRepository.create({
      ...data,
      anneeScolaire
    });

    return this.classeRepository.save(newClasse);
  }

  async updateClasse(id: number, data: Partial<Classe>): Promise<Classe> {
    await this.classeRepository.update(id, data);
    return this.findById(id);
  }

  async deleteClasse(id: number): Promise<void> {
    const result = await this.classeRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Classe avec l'ID ${id} non trouvée pour suppression`);
    }
  }

  async findByAnneeScolaire(anneeScolaireId: number): Promise<Classe[]> {
    return this.classeRepository.find({
      where: { anneeScolaire: { id: anneeScolaireId } },
      relations: ['anneeScolaire']
    });
  }
}